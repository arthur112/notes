# ExcelImport note

A self-contained .NET 10 app demonstrating the **staging + normalization** pattern for importing wide, semi-controlled Excel **or delimited txt/csv** files **at scale** (millions of rows): files are streamed verbatim into a staging table by **[TickerQ](https://tickerq.net) background jobs**, then drained chunk-by-chunk into **normalized** tables — with a **strategy per file type** and **[FluentValidation](https://docs.fluentvalidation.net/)** for row validation.

Companion reading: [NORMALIZATION.md](NORMALIZATION.md) — a practical guide to taking a wide 30+ column table to 3NF, using this exact example. [SQLSERVER.md](SQLSERVER.md) — what changes (and what doesn't) when targeting SQL Server instead of SQLite, with snippets.

## The scenario

Two file types, generated at runtime (default 10k / 2.5k rows, `--rows 100000` for the realistic run), each with planted invalid rows. Pass `--txt` to generate comma-separated `.txt` files instead of `.xlsx`:

1. `sample-orders.xlsx` / `sample-orders.txt` — wide flat export, embedded customer + repeated group:
   ```
   Date | CustomerName | CustomerCity | Product1 | Qty1 | Price1 | Product2 | Qty2 | Price2 | Product3 | Qty3 | Price3
   ```
2. `sample-inventory.xlsx` / `sample-inventory.txt` — different layout, different target tables:
   ```
   SKU | Warehouse | OnHand | ReorderLevel
   ```

## Architecture

Why hybrid (staging + normalization) instead of importing straight into fully normalized tables? See [ADR-001](ADR-001-hybrid-import-pipeline.md).

```
                  [TickerFunction("StageFile")]              [TickerFunction("TransformBatch")]
                  streams file (IStagingReader)              drains pending rows in chunks of 1000,
  xlsx/txt ───▶  chunked inserts (1000/batch)     ───▶     re-enqueues itself while rows remain ───▶  normalized tables
                  into ImportBatches/ImportRows              strategy per FileType + FluentValidation
```

- **Staging** (`Staging/StagingLoader.cs`): picks an `IStagingReader` by extension — `ExcelStagingReader` (ExcelDataReader, forward-only) for `.xlsx`, `DelimitedStagingReader` ([Sep](https://github.com/nietras/Sep), span-based SIMD parsing, fixed comma) for `.txt`/`.csv`. Rows are stored as raw JSON in chunks, no validation; flat memory at any file size. `ImportBatch` carries `FileType` (inferred from file name) + progress counters (`TotalRows`/`ProcessedRows`/`FailedRows`).
- **Transform** (`Transform/`): `Transformer.ProcessNextChunkAsync` pages pending rows by Id, one `SaveChanges` per chunk, counters updated via `ExecuteUpdate`. Crash-safe: rows are durable with a status, so the next job run resumes where it stopped.
- **Jobs** (`Jobs/ImportJobs.cs`): TickerQ jobs persisted in the same SQLite file (`TimeTickers` tables). `StageFile` chains into `TransformBatch` per batch; the transform self-continues until the batch is drained.

### Strategy pattern

```csharp
public interface IImportStrategy
{
    string FileType { get; }                                          // "orders", "inventory"
    void ProcessChunk(IReadOnlyList<ImportRow> rows, ImportContext db);
}
```

Each file type owns a folder under `Transform/` with its DTO, FluentValidation validator, and strategy. Strategies keep **per-chunk lookup caches** for reference entities (customers by name, products by SKU) — no per-row queries. The inventory strategy upserts stock levels with **one multi-row SQL statement per slice** (SQLite-native `ON CONFLICT`, atomic and race-free), making re-imports idempotent:

```sql
INSERT INTO "StockLevels" ("ProductId", "Warehouse", "OnHand", "ReorderLevel")
VALUES (@p0, @w0, @o0, @r0), (@p1, @w1, @o1, @r1), ...
ON CONFLICT ("ProductId", "Warehouse")
DO UPDATE SET "OnHand" = "excluded"."OnHand", "ReorderLevel" = "excluded"."ReorderLevel";
```

(Same syntax works on Postgres; SQL Server's equivalent is `MERGE`.) Adding a third file type = one new folder + one entry in the resolver.

### Reflection-free JSON

Staging stores every row as raw JSON (`ImportRow.RawJson`); at 2M rows the serializer is a hot path, so all JSON is reflection-free:

- `ImportJsonContext.cs` — a `[JsonSourceGenerationOptions]` source-generated `JsonSerializerContext` covering the strategy DTOs and `Dictionary<string,string>`; used by the strategies, the reprocess step, and the Excel reader.
- `DelimitedStagingReader` skips the intermediate `Dictionary` entirely: it writes each row straight to `RawJson` with `Utf8JsonWriter` over a pooled `ArrayBufferWriter<byte>`, reading Sep column values as `ReadOnlySpan<char>` — ~zero per-row allocation besides the final string.

### FluentValidation

Declarative rules collecting **all** problems at once; failures are joined into `ImportRow.Error`:

```csharp
RuleFor(x => x.Date).Must(BeAValidDate).WithMessage(x => $"Invalid date '{x.Date}'");
RuleFor(x => x).Custom(ValidateSlots);   // cross-field rules for the Product/Qty/Price triplets
```

The demo then **reprocesses**: failed rows are corrected *in staging* (no re-import), reset to `Pending`, and a new `TransformBatch` job is enqueued.

### Normalized model (`Domain/`)

```
Customers:   Id, Name, City                 <- find-or-create by name
Orders:      Id, Date, CustomerId (FK)
OrderLines:  Id, OrderId (FK), ProductCode, Quantity, UnitPrice   <- repeated group un-pivoted
Products:    Id, Sku                        <- find-or-create by SKU
StockLevels: Id, ProductId (FK), Warehouse, OnHand, ReorderLevel  <- upserted
```

## Layout

```
ExcelImport/
├── src/
│   ├── Program.cs                # host setup, enqueue, progress polling, reprocess, verify
│   ├── ImportJsonContext.cs      # source-generated JsonSerializerContext (reflection-free JSON)
│   ├── Jobs/ImportJobs.cs        # [TickerFunction] StageFile / TransformBatch
│   ├── Data/ImportContext.cs     # EF Core + SQLite (WAL), schema via GenerateCreateScript
│   ├── Staging/                  # ImportBatch, ImportRow, StagingLoader, IStagingReader,
│   │                             # ExcelStagingReader, DelimitedStagingReader (Sep), SampleData
│   ├── Domain/                   # Customer, Order, OrderLine, Product, StockLevel (normalized)
│   ├── Transform/
│   │   ├── IImportStrategy.cs    # chunk-based strategy contract
│   │   ├── ImportStrategyResolver.cs
│   │   ├── ImportRowExtensions.cs# row.Fail(...) / row.Succeed()
│   │   ├── Transformer.cs        # ProcessNextChunkAsync
│   │   ├── Orders/               # DTO + OrderRowValidator + OrderImportStrategy
│   │   └── Inventory/            # DTO + InventoryRowValidator + InventoryImportStrategy (upsert)
│   ├── db/                       # excelimport.sqlite (+ WAL files) lands here (gitignored)
│   └── sample-*.xlsx / .txt      # generated at runtime (gitignored)
├── NORMALIZATION.md              # the normalization guide
├── SQLSERVER.md                  # SQL Server variant: MERGE upsert, SqlBulkCopy, concurrency
└── README.md
```

## Run it

```bash
cd ExcelImport
dotnet run --project src                        # 10k orders + 2.5k inventory demo (xlsx)
dotnet run --project src -- --rows 100000       # realistic file sizes
dotnet run --project src -- --reset             # wipe the SQLite db first
dotnet run --project src -- --reset --rows 100000
dotnet run --project src -- --txt --reset --rows 2000000   # 2M-row delimited txt instead of xlsx
```

Expected output: jobs enqueued, live progress per batch (chunked transform visible), ~18 planted failures with FluentValidation messages, all reprocessed after correction, then verification queries (orders per customer, revenue per product, low stock).

## Scaling notes

- **Chunk sizes** (staging flush = 1000, transform = 1000) are the main knobs; raise for fewer round-trips, lower for less memory/lock time.
- **File parsing is not the bottleneck**: the Sep-based delimited reader parses multi-million-line files in seconds; throughput is bounded by the EF chunked inserts into staging — raise the staging chunk size or switch the staging flush to a bulk insert for more.
- SQLite works because of **WAL mode + busy timeout** (`Program.cs`), but it's single-writer: for real multi-job concurrency use SQL Server/Postgres — only the connection string changes.
- Batch counters (`ProcessedRows`/`FailedRows`) are cumulative work counters, updated atomically with `ExecuteUpdate` — safe to read from a dashboard while jobs run.
- Add `TickerQ.Dashboard` + `app.UseTickerQ()` dashboard options for a live UI; see tickerq.net/docs/dashboard.

## Adapting this to a real system

- New file type: add `Transform/<Type>/` (DTO + validator + strategy) and register it in the resolver.
- New job: add a `[TickerFunction]` method; schedule via `ITimeTickerManager<TimeTickerEntity>` (one-off/chained) or a `CronTickerEntity` (recurring).
- Trigger imports from an upload endpoint, folder watch, or cron instead of `Program.cs` seeding.
- Keep failed rows visible somewhere (a query, admin page, or the TickerQ dashboard) — that list *is* your data-quality feedback loop.
- Strategies are plain classes registered in DI; inject scoped services into them via the job class as needed.
