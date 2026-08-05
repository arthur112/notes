using BenchmarkDotNet.Running;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Parallelism.Benchmarks;
using Parallelism.Data;
using Parallelism.Jobs;
using Parallelism.Parsing;
using System.Diagnostics;
using TickerQ.DependencyInjection;
using TickerQ.EntityFrameworkCore.DbContextFactory;
using TickerQ.EntityFrameworkCore.DependencyInjection;
using TickerQ.Utilities;
using TickerQ.Utilities.Entities;
using TickerQ.Utilities.Enums;
using TickerQ.Utilities.Interfaces.Managers;

namespace Parallelism;

internal static class Program
{
    public static readonly (int Rows, string Suffix)[] Sizes =
        [(10_000, "10k"), (100_000, "100k"), (1_000_000, "1m"), (2_000_000, "2m")];

    public static string DataDirectory { get; private set; } = null!;

    private static async Task Main(string[] args)
    {
        var generate = Array.Exists(args, a => a is "--generate" or "-g");
        var benchmark = Array.Exists(args, a => a is "--benchmark" or "-b");
        var reset = Array.Exists(args, a => a is "--reset" or "-r");
        var runIndex = Array.IndexOf(args, "--run");
        var runFile = runIndex >= 0 && runIndex + 1 < args.Length ? args[runIndex + 1] : null;

        if (!generate && !benchmark && runFile is null)
        {
            Console.WriteLine("Usage:");
            Console.WriteLine("  --generate            generate the 10k/100k/1m/2m sample files into data/");
            Console.WriteLine("  --run <file> [--reset]  import one file via a TickerQ background job");
            Console.WriteLine("  --benchmark           BenchmarkDotNet over all four file sizes");
            return;
        }

        DataDirectory = Path.Combine(FindProjectRoot(), "data");
        Directory.CreateDirectory(DataDirectory);

        if (generate || benchmark)
        {
            foreach (var (rows, suffix) in Sizes)
            {
                var path = Path.Combine(DataDirectory, $"orders-{suffix}.txt");
                if (!File.Exists(path))
                {
                    Console.WriteLine($"Generating {rows:N0}-row file: {path}");
                    SampleData.Generate(path, rows);
                }
            }
        }

        var builder = Host.CreateApplicationBuilder();
        builder.Logging.SetMinimumLevel(runFile is not null ? LogLevel.Information : LogLevel.Warning);
        var connectionString = builder.Configuration.GetConnectionString("Import")
            ?? "Server=localhost,1433;Database=Parallelism;User Id=sa;Password=Str0ng!Passw0rd;TrustServerCertificate=true";

        builder.Services.AddDbContextFactory<ImportContext>(o => o.UseSqlServer(connectionString));
        builder.Services.AddSingleton(connectionString);
        builder.Services.AddSingleton(new RowParserResolver([new TxtOrderParser()]));
        builder.Services.AddSingleton<ImportCompletion>();
        builder.Services.AddTransient<ImportJobs>();
        builder.Services.AddTickerQ(opt =>
        {
            opt.AddOperationalStore(ef => ef.UseTickerQDbContext<TickerQDbContext>(db => db.UseSqlServer(connectionString)));
        });

        var app = builder.Build();
        app.UseTickerQ(TickerQStartMode.Immediate);

        await EnsureSchemaAsync(new ImportContext(new DbContextOptionsBuilder<ImportContext>().UseSqlServer(connectionString).Options), "StagedOrders");
        await EnsureSchemaAsync(new TickerQDbContext(new DbContextOptionsBuilder<TickerQDbContext>().UseSqlServer(connectionString).Options), "TimeTickers");

        await app.StartAsync();

        if (reset)
        {
            Console.WriteLine("Truncating staging and domain tables...");
            await DatabaseReset.TruncateAsync(connectionString);
        }

        if (benchmark)
        {
            BenchmarkHost.Services = app.Services;
            BenchmarkHost.ConnectionString = connectionString;
            BenchmarkRunner.Run<ImportBenchmarks>();
        }
        else if (runFile is not null)
        {
            await RunImportAsync(app.Services, Path.GetFullPath(runFile), connectionString);
        }

        await app.StopAsync();
    }

    private static async Task RunImportAsync(IServiceProvider services, string filePath, string connectionString)
    {
        Console.WriteLine($"Enqueuing ImportFile for {filePath}");
        var completion = services.GetRequiredService<ImportCompletion>();
        var timeTicker = services.GetRequiredService<ITimeTickerManager<TimeTickerEntity>>();

        var stopwatch = Stopwatch.StartNew();
        var task = completion.Track(filePath);
        await timeTicker.AddAsync(new TimeTickerEntity
        {
            Function = "ImportFile",
            ExecutionTime = DateTime.UtcNow,
            Request = TickerHelper.CreateTickerRequest(filePath),
        });

        var rows = await task;
        stopwatch.Stop();
        Console.WriteLine($"Imported {rows:N0} rows in {stopwatch.Elapsed.TotalSeconds:N1} s.");

        await using var connection = new Microsoft.Data.SqlClient.SqlConnection(connectionString);
        await connection.OpenAsync();
        foreach (var table in new[] { "StagedOrders", "Customers", "Orders", "OrderLines" })
        {
            await using var command = new Microsoft.Data.SqlClient.SqlCommand($"SELECT COUNT(*) FROM {table}", connection);
            Console.WriteLine($"   {table}: {Convert.ToInt64(await command.ExecuteScalarAsync()):N0}");
        }
    }

    private static async Task EnsureSchemaAsync(DbContext context, string probeTable)
    {
        await context.Database.EnsureCreatedAsync();
        var exists = await context.Database
            .SqlQuery<int>($"SELECT COUNT(*) AS Value FROM sys.tables WHERE name = {probeTable}")
            .SingleAsync() == 1;

        if (!exists)
        {
            foreach (var batch in SplitBatches(context.Database.GenerateCreateScript()))
            {
                await context.Database.ExecuteSqlRawAsync(batch);
            }
        }
    }

    private static IEnumerable<string> SplitBatches(string script)
    {
        var batch = new System.Text.StringBuilder();
        foreach (var line in script.Split('\n'))
        {
            if (line.Trim() == "GO")
            {
                if (batch.Length > 0)
                {
                    yield return batch.ToString();
                    batch.Clear();
                }
            }
            else
            {
                batch.AppendLine(line);
            }
        }
        if (batch.Length > 0)
        {
            yield return batch.ToString();
        }
    }

    private static string FindProjectRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "Parallelism.csproj")))
            {
                return dir.FullName;
            }
            dir = dir.Parent;
        }
        return AppContext.BaseDirectory;
    }
}
