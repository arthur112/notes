# SQL Server variant

What changes if this note's pipeline targets **SQL Server** instead of SQLite — and why. The pipeline shape (staging → chunked transform → strategy per file type) is untouched; only the provider-specific edges change.

Baseline (SQLite, 2M orders + 500k inventory txt rows, Release): **~4m53s total** — staging ~37s, transform ~85% of runtime.

## Changes at a glance

| Area | SQLite (this note) | SQL Server | Why |
| --- | --- | --- | --- |
| EF provider | `Microsoft.EntityFrameworkCore.Sqlite` | `Microsoft.EntityFrameworkCore.SqlServer` | connection string + package swap |
| Staging flush | EF chunked inserts (1000/batch) | `SqlBulkCopy` | flat rows, no FKs — bulk path |
| Orders transform | per-row EF INSERTs (~6M statements) | EF already batches multi-row INSERTs + `OUTPUT INSERTED.Id` | no manual work needed |
| Inventory upsert | `ON CONFLICT DO UPDATE` (SQLite/Postgres syntax) | `MERGE` | syntax is provider-specific |
| Concurrency | single writer (WAL) | staging of batch B overlaps transform of batch A | phases overlap |
| TickerQ store | same SQLite file | same SQL Server database | EF store, provider swap only |

Expected at 2M rows: **~1-1.5 min total** vs ~4m53s on SQLite, mostly from concurrency overlap + batched inserts.

## 1. Provider swap

```diff
- <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="10.0.9" />
+ <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="10.0.9" />
```

```csharp
// Program.cs — the only connection change; ImportContext, TickerQ store, schema creation are untouched
var connectionString = builder.Configuration.GetConnectionString("Import")
    ?? "Server=localhost;Database=ExcelImport;Integrated Security=true;TrustServerCertificate=true";

builder.Services.AddDbContextFactory<ImportContext>(o => o.UseSqlServer(connectionString));
builder.Services.AddTickerQ(opt =>
{
    opt.AddOperationalStore(ef => ef.UseTickerQDbContext<TickerQDbContext>(db => db.UseSqlServer(connectionString)));
});
```

The WAL pragma block in `Program.cs` (lines ~79-85) is deleted — no SQLite equivalent concern. `GenerateCreateScript()` schema creation works unchanged.

## 2. Staging flush with SqlBulkCopy

`ImportRow` is flat (`BatchId`, `RowNumber`, `RawJson`, `Status`) — no FKs to resolve — so the chunk flush in `StagingLoader` becomes a bulk copy. Staging 2M rows drops from ~37s to a few seconds.

```csharp
// Staging/SqlBulkStagingFlush.cs
using Microsoft.Data.SqlClient;
using System.Data;

public static class SqlBulkStagingFlush
{
    public static async Task FlushAsync(string connectionString, List<ImportRow> buffer, CancellationToken ct)
    {
        var table = new DataTable();
        table.Columns.Add("BatchId", typeof(int));
        table.Columns.Add("RowNumber", typeof(int));
        table.Columns.Add("RawJson", typeof(string));
        table.Columns.Add("Status", typeof(int));

        foreach (var row in buffer)
        {
            table.Rows.Add(row.BatchId, row.RowNumber, row.RawJson, (int)row.Status);
        }

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(ct);
        using var bulk = new SqlBulkCopy(connection) { DestinationTableName = "ImportRows" };
        bulk.ColumnMappings.Add("BatchId", "BatchId");
        bulk.ColumnMappings.Add("RowNumber", "RowNumber");
        bulk.ColumnMappings.Add("RawJson", "RawJson");
        bulk.ColumnMappings.Add("Status", "Status");
        await bulk.WriteToServerAsync(table, ct);
    }
}
```

```diff
  // StagingLoader.cs — inside the chunk flush
- db.Rows.AddRange(buffer);
- await db.SaveChangesAsync(cancellationToken);
- db.ChangeTracker.Clear();
+ await SqlBulkStagingFlush.FlushAsync(connectionString, buffer, cancellationToken);
```

`StagingLoader.LoadAsync` needs the connection string passed in (from `ImportJobs`, which reads it from config). The batch-create and batch-finalize `ExecuteUpdate` calls stay on EF.

## 3. Orders transform — nothing to do

This is the pleasant surprise: EF Core's SQL Server provider already packs pending inserts into multi-row statements and returns generated keys via `OUTPUT INSERTED.Id`, so the ~6M single-row INSERTs that dominate on SQLite become batched automatically. `OrderImportStrategy` is **unchanged**.

For reference, what EF emits on SQL Server for new `Order` + `OrderLine` graphs:

```sql
MERGE [Orders] USING (
    VALUES (@p0, @p1), (@p2, @p3), ...   -- many rows per statement
) AS i ([Date], [CustomerId], _Position) ON 1 = 0
WHEN NOT MATCHED THEN
    INSERT ([Date], [CustomerId]) VALUES (i.[Date], i.[CustomerId])
    OUTPUT INSERTED.[Id], i._Position;
```

The `OUTPUT` clause hands the generated `Order.Id` back to EF, which wires the `OrderLines` FKs in memory — the manual `RETURNING` plumbing you'd need on SQLite is built in here.

Optional extra win, provider-agnostic: hoist the per-chunk customer cache (`WHERE Name IN (...)`, rebuilt 2000x per batch) to batch scope.

## 4. Inventory upsert — the one mandatory code change

`ON CONFLICT` is SQLite/Postgres syntax. The SQL Server equivalent is `MERGE` — `InventoryImportStrategy.UpsertSliceAsync` becomes:

```csharp
// Transform/Inventory/InventoryImportStrategy.cs — SQL Server variant
private static async Task UpsertSliceAsync(
    List<(ImportRow Row, Product Product, string Warehouse, int OnHand, int ReorderLevel)> slice,
    ImportContext db, CancellationToken cancellationToken)
{
    // source rows as a VALUES table
    var sql = new StringBuilder("""
        MERGE INTO "StockLevels" AS t
        USING (VALUES 
        """);
    var parameters = new List<SqlParameter>(slice.Count * 4);

    for (var i = 0; i < slice.Count; i++)
    {
        var (_, product, warehouse, onHand, reorderLevel) = slice[i];
        if (i > 0)
        {
            sql.Append(", ");
        }
        sql.Append($"(@p{i}, @w{i}, @o{i}, @r{i})");
        parameters.Add(new SqlParameter($"@p{i}", product.Id));
        parameters.Add(new SqlParameter($"@w{i}", warehouse));
        parameters.Add(new SqlParameter($"@o{i}", onHand));
        parameters.Add(new SqlParameter($"@r{i}", reorderLevel));
    }

    sql.Append("""
        ) AS s ("ProductId", "Warehouse", "OnHand", "ReorderLevel")
        ON t."ProductId" = s."ProductId" AND t."Warehouse" = s."Warehouse"
        WHEN MATCHED THEN
            UPDATE SET "OnHand" = s."OnHand", "ReorderLevel" = s."ReorderLevel"
        WHEN NOT MATCHED THEN
            INSERT ("ProductId", "Warehouse", "OnHand", "ReorderLevel")
            VALUES (s."ProductId", s."Warehouse", s."OnHand", s."ReorderLevel");
        """);

    try
    {
        await db.Database.ExecuteSqlRawAsync(sql.ToString(), parameters, cancellationToken);
        foreach (var (row, _, _, _, _) in slice)
        {
            row.Succeed();
        }
    }
    catch (Exception ex)
    {
        foreach (var (row, _, _, _, _) in slice)
        {
            row.Fail(ex.Message);
        }
    }
}
```

Same slice loop (500 rows/statement), same idempotency semantics, same race-free single statement. Caveat: `MERGE` acquires locks differently than `ON CONFLICT` — under concurrent upserts of the same keys, add `WITH (HOLDLOCK)` on the target or use the `INSERT ... WHERE NOT EXISTS` + `UPDATE` two-statement pattern inside a transaction.

Even better on SQL Server: replace the `VALUES` table with a **table-valued parameter** (a user-defined table type), so one `MERGE` handles the whole chunk and rows stream without parameter limits:

```sql
CREATE TYPE StockLevelUpsert AS TABLE
(
    ProductId int NOT NULL,
    Warehouse nvarchar(100) NOT NULL,
    OnHand int NOT NULL,
    ReorderLevel int NOT NULL
);
```

```csharp
await using var command = connection.CreateCommand();
command.CommandText = """
    MERGE INTO "StockLevels" WITH (HOLDLOCK) AS t
    USING @rows AS s
    ON t."ProductId" = s."ProductId" AND t."Warehouse" = s."Warehouse"
    WHEN MATCHED THEN UPDATE SET "OnHand" = s."OnHand", "ReorderLevel" = s."ReorderLevel"
    WHEN NOT MATCHED THEN INSERT ("ProductId", "Warehouse", "OnHand", "ReorderLevel")
        VALUES (s."ProductId", s."Warehouse", s."OnHand", s."ReorderLevel");
    """;
var tvp = command.Parameters.AddWithValue("@rows", table); // DataTable like §2
tvp.SqlDbType = SqlDbType.Structured;
tvp.TypeName = "dbo.StockLevelUpsert";
await command.ExecuteNonQueryAsync(cancellationToken);
```

## 5. Concurrency — the quiet win

Nothing to code, but the behavior changes: on SQLite the `StageFile` of the next batch blocks on the writer lock while `TransformBatch` commits. On SQL Server both proceed concurrently, so staging and transform overlap across batches. With many files this matters more than any single statement optimization.

If you run multiple TickerQ workers, also raise the transform chunk size (`ImportJobs.ChunkSize`, currently 1000 → 5000+) — SQL Server absorbs larger commits comfortably, and per-chunk overhead (round-trips, cache warm-up) amortizes.

## What does *not* change

- `Sep`-based delimited reader, `Utf8JsonWriter` staging serialization, source-generated `ImportJsonContext` — the file-side perf work is provider-independent.
- The strategy contract, validators, `Transformer`, job chaining, batch counters, reprocess flow.
- The normalized model and unique indexes (`Customers.Name`, `Products.Sku`, `StockLevels(ProductId, Warehouse)`) — `MERGE` relies on the last one just as `ON CONFLICT` did.
