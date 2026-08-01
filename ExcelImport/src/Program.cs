using ExcelImport.Data;
using ExcelImport.Jobs;
using ExcelImport.Staging;
using ExcelImport.Transform;
using ExcelImport.Transform.Inventory;
using ExcelImport.Transform.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TickerQ.DependencyInjection;
using TickerQ.EntityFrameworkCore.DbContextFactory;
using TickerQ.EntityFrameworkCore.DependencyInjection;
using TickerQ.Utilities;
using TickerQ.Utilities.Entities;
using TickerQ.Utilities.Enums;
using TickerQ.Utilities.Interfaces.Managers;
using System.Globalization;
using System.Text.Json;

namespace ExcelImport;

internal static class Program
{
    private static async Task Main(string[] args)
    {
        System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);

        var reset = Array.Exists(args, a => a is "--reset" or "-r");
        var rowsIndex = Array.IndexOf(args, "--rows");
        var rowCount = rowsIndex >= 0 && rowsIndex + 1 < args.Length && int.TryParse(args[rowsIndex + 1], out var n) && n > 0
            ? n
            : 10_000;

        var root = FindProjectRoot();
        var dbDir = Path.Combine(root, "db");
        Directory.CreateDirectory(dbDir);
        var dbPath = Path.Combine(dbDir, "excelimport.sqlite");
        var ordersFile = Path.Combine(root, "sample-orders.xlsx");
        var inventoryFile = Path.Combine(root, "sample-inventory.xlsx");
        var connectionString = $"Data Source={dbPath};Default Timeout=30";

        if (reset)
        {
            foreach (var file in new[] { dbPath, dbPath + "-wal", dbPath + "-shm" })
            {
                if (File.Exists(file))
                {
                    File.Delete(file);
                    Console.WriteLine($"Removed existing file: {file}");
                }
            }
        }

        if (!File.Exists(ordersFile))
        {
            SampleData.GenerateOrders(ordersFile, rowCount);
            Console.WriteLine($"Generated {rowCount:N0}-row file: {ordersFile}");
        }
        if (!File.Exists(inventoryFile))
        {
            SampleData.GenerateInventory(inventoryFile, rowCount / 4);
            Console.WriteLine($"Generated {rowCount / 4:N0}-row file: {inventoryFile}");
        }

        var builder = Host.CreateApplicationBuilder();
        builder.Logging.SetMinimumLevel(LogLevel.Warning);
        builder.Services.AddDbContextFactory<ImportContext>(o => o.UseSqlite(connectionString));
        builder.Services.AddSingleton(new ImportStrategyResolver([new OrderImportStrategy(), new InventoryImportStrategy()]));
        builder.Services.AddTransient<ImportJobs>();
        builder.Services.AddTickerQ(opt =>
        {
            opt.AddOperationalStore(ef => ef.UseTickerQDbContext<TickerQDbContext>(db => db.UseSqlite(connectionString)));
        });

        var app = builder.Build();
        app.UseTickerQ(TickerQStartMode.Immediate);

        await using (var raw = new Microsoft.Data.Sqlite.SqliteConnection(connectionString))
        {
            await raw.OpenAsync();
            await using var pragma = raw.CreateCommand();
            pragma.CommandText = "PRAGMA journal_mode=WAL;";
            await pragma.ExecuteNonQueryAsync();
        }

        await using (var db = new ImportContext(new DbContextOptionsBuilder<ImportContext>().UseSqlite(connectionString).Options))
        {
            await EnsureSchemaAsync(db, "ImportBatches");
        }
        await using (var tickerDb = new TickerQDbContext(new DbContextOptionsBuilder<TickerQDbContext>().UseSqlite(connectionString).Options))
        {
            await EnsureSchemaAsync(tickerDb, "TimeTickers");
        }

        await app.StartAsync();

        Console.WriteLine("\n--- Enqueuing background jobs (TickerQ) ---");
        await using (var scope = app.Services.CreateAsyncScope())
        {
            var timeTicker = scope.ServiceProvider.GetRequiredService<ITimeTickerManager<TimeTickerEntity>>();
            foreach (var file in new[] { ordersFile, inventoryFile })
            {
                await timeTicker.AddAsync(new TimeTickerEntity
                {
                    Function = "StageFile",
                    ExecutionTime = DateTime.UtcNow,
                    Request = TickerHelper.CreateTickerRequest(file)
                });
                Console.WriteLine($"Enqueued StageFile for {Path.GetFileName(file)}");
            }
        }

        await WaitForIdleAsync(app.Services, expectedBatches: 2);

        await using (var scope = app.Services.CreateAsyncScope())
        {
            var factory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<ImportContext>>();
            await using var db = await factory.CreateDbContextAsync();
            PrintRowSummary(db);
        }

        Console.WriteLine("\n--- Reprocessing: fix failed rows in staging, re-enqueue transform ---");
        var affectedBatches = new List<int>();
        await using (var scope = app.Services.CreateAsyncScope())
        {
            var factory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<ImportContext>>();
            await using var db = await factory.CreateDbContextAsync();

            var failed = await db.Rows.Where(r => r.Status == RowStatus.Failed).ToListAsync();
            var batchTypes = await db.Batches.ToDictionaryAsync(b => b.Id, b => b.FileType);
            foreach (var row in failed)
            {
                Correct(row, batchTypes[row.BatchId]);
                row.Status = RowStatus.Pending;
                row.Error = null;
            }
            await db.SaveChangesAsync();
            affectedBatches = failed.Select(r => r.BatchId).Distinct().ToList();
            Console.WriteLine($"Corrected {failed.Count:N0} row(s) across {affectedBatches.Count} batch(es).");

            var timeTicker = scope.ServiceProvider.GetRequiredService<ITimeTickerManager<TimeTickerEntity>>();
            foreach (var batchId in affectedBatches)
            {
                await timeTicker.AddAsync(new TimeTickerEntity
                {
                    Function = "TransformBatch",
                    ExecutionTime = DateTime.UtcNow,
                    Request = TickerHelper.CreateTickerRequest(batchId)
                });
            }
        }

        if (affectedBatches.Count > 0)
        {
            await WaitForIdleAsync(app.Services, expectedBatches: 2);
        }

        await using (var scope = app.Services.CreateAsyncScope())
        {
            var factory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<ImportContext>>();
            await using var db = await factory.CreateDbContextAsync();
            PrintRowSummary(db);
            await PrintVerificationAsync(db);
        }

        await app.StopAsync();
        Console.WriteLine("\nAll good. Files staged and transformed by TickerQ background jobs.");
    }

    private static async Task WaitForIdleAsync(IServiceProvider services, int expectedBatches)
    {
        var factory = services.GetRequiredService<IDbContextFactory<ImportContext>>();
        var deadline = DateTime.UtcNow.AddMinutes(10);
        var lastLine = string.Empty;

        while (DateTime.UtcNow < deadline)
        {
            await using var db = await factory.CreateDbContextAsync();
            var batches = await db.Batches.AsNoTracking().OrderBy(b => b.Id).ToListAsync();
            var progress = await db.Rows
                .GroupBy(r => r.BatchId)
                .Select(g => new
                {
                    BatchId = g.Key,
                    Total = g.Count(),
                    Pending = g.Count(r => r.Status == RowStatus.Pending),
                    Failed = g.Count(r => r.Status == RowStatus.Failed)
                })
                .ToDictionaryAsync(x => x.BatchId);
            var pending = progress.Values.Sum(x => x.Pending);

            var line = string.Join("  |  ", batches.Select(b =>
            {
                var p = progress.GetValueOrDefault(b.Id);
                return $"#{b.Id} {b.FileName}: {(p is null ? 0 : p.Total - p.Pending):N0}/{(p?.Total ?? 0):N0} ({(p?.Failed ?? 0):N0} failed)";
            }));
            if (line != lastLine)
            {
                Console.WriteLine(line);
                lastLine = line;
            }

            if (batches.Count >= expectedBatches && pending == 0 && batches.All(b => b.TotalRows > 0))
            {
                await Task.Delay(500);
                return;
            }

            await Task.Delay(500);
        }

        throw new TimeoutException("Timed out waiting for background jobs to drain.");
    }

    private static void PrintRowSummary(ImportContext db)
    {
        Console.WriteLine("\n--- Row summary ---");
        var stats = db.Rows.GroupBy(r => r.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToList();
        foreach (var s in stats)
        {
            Console.WriteLine($"   {s.Status}: {s.Count:N0}");
        }

        foreach (var error in db.Rows.Where(r => r.Status == RowStatus.Failed)
                     .GroupBy(r => r.Error)
                     .Select(g => new { Error = g.Key, Count = g.Count() })
                     .OrderByDescending(x => x.Count)
                     .Take(5)
                     .ToList())
        {
            Console.WriteLine($"   failed x{error.Count:N0}: {error.Error}");
        }
    }

    private static void Correct(ImportRow row, string fileType)
    {
        var data = JsonSerializer.Deserialize<Dictionary<string, string>>(row.RawJson)!;

        if (fileType == "orders")
        {
            if (!DateOnly.TryParse(data["Date"], CultureInfo.InvariantCulture, out _))
            {
                data["Date"] = "2026-01-08";
            }
            if (data["Product1"].Trim().Length == 0)
            {
                data["Product1"] = "B-200";
            }
        }
        else if (fileType == "inventory")
        {
            if (int.TryParse(data["OnHand"], NumberStyles.Integer, CultureInfo.InvariantCulture, out var onHand) && onHand < 0)
            {
                data["OnHand"] = "0";
            }
        }

        row.RawJson = JsonSerializer.Serialize(data);
    }

    private static async Task PrintVerificationAsync(ImportContext db)
    {
        Console.WriteLine("\n--- Verification: orders per customer ---");
        var perCustomer = await db.Customers
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Name,
                c.City,
                Orders = c.Orders.Count,
                Total = c.Orders.SelectMany(o => o.Lines).Sum(l => l.Quantity * l.UnitPrice)
            })
            .ToListAsync();

        foreach (var c in perCustomer)
        {
            Console.WriteLine($"   {c.Name,-15} ({c.City,-7})  {c.Orders:N0} order(s), total {c.Total:N2}");
        }

        Console.WriteLine("\n--- Verification: totals per product (from order lines) ---");
        var perProduct = await db.OrderLines
            .GroupBy(l => l.ProductCode)
            .Select(g => new
            {
                Product = g.Key,
                Qty = g.Sum(l => l.Quantity),
                Revenue = g.Sum(l => l.Quantity * l.UnitPrice)
            })
            .OrderBy(x => x.Product)
            .ToListAsync();

        foreach (var p in perProduct)
        {
            Console.WriteLine($"   {p.Product}: {p.Qty:N0} unit(s), revenue {p.Revenue:N2}");
        }

        Console.WriteLine("\n--- Verification: low stock (from inventory import) ---");
        var lowStock = await db.StockLevels
            .Include(s => s.Product)
            .Where(s => s.OnHand <= s.ReorderLevel)
            .OrderBy(s => s.Product.Sku)
            .Take(10)
            .ToListAsync();

        foreach (var s in lowStock)
        {
            Console.WriteLine($"   {s.Product.Sku} @ {s.Warehouse,-7}: {s.OnHand,3} on hand (reorder at {s.ReorderLevel})");
        }
    }

    private static async Task EnsureSchemaAsync(DbContext context, string probeTable)
    {
        var exists = await context.Database
            .SqlQuery<int>($"SELECT COUNT(*) AS \"Value\" FROM sqlite_master WHERE type = 'table' AND name = {probeTable}")
            .SingleAsync() == 1;

        if (!exists)
        {
            await context.Database.ExecuteSqlRawAsync(context.Database.GenerateCreateScript());
        }
    }

    private static string FindProjectRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "ExcelImport.csproj")))
            {
                return dir.FullName;
            }
            dir = dir.Parent;
        }
        return AppContext.BaseDirectory;
    }
}
