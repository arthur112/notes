# ExcelImport note

A self-contained .NET 10 app demonstrating the **staging + normalization** pattern for importing wide, semi-controlled Excel files **at scale** (100k+ rows): files are streamed verbatim into a staging table by **[TickerQ](https://tickerq.net) background jobs**, then drained chunk-by-chunk into **normalized** tables — with a **strategy per file type** and **[FluentValidation](https://docs.fluentvalidation.net/)** for row validation.

Companion reading: [NORMALIZATION.md](NORMALIZATION.md) — a practical guide to taking a wide 30+ column table to 3NF, using this exact example.

## The scenario

Two file types, generated at runtime (default 10k / 2.5k rows, `--rows 100000` for the realistic run), each with planted invalid rows:

1. `sample-orders.xlsx` — wide flat export, embedded customer + repeated group:
   ```
   Date | CustomerName | CustomerCity | Product1 | Qty1 | Price1 | Product2 | Qty2 | Price2 | Product3 | Qty3 | Price3
   ```
2. `sample-inventory.xlsx` — different layout, different target tables:
   ```
   SKU | Warehouse | OnHand | ReorderLevel
   ```

## Architecture

Why hybrid (staging + normalization) instead of importing straight into fully normalized tables? See [ADR-001](ADR-001-hybrid-import-pipeline.md).

```
                 [TickerFunction("StageFile")]              [TickerFunction("TransformBatch")]
                 streams file (ExcelDataReader)             drains pending rows in chunks of 1000,
 Excel file ───▶  chunked inserts (1000/batch)     ───▶     re-enqueues itself while rows remain ───▶  normalized tables
                 into ImportBatches/ImportRows              strategy per FileType + FluentValidation
```

- **Staging** (`Staging/StagingLoader.cs`): forward-only streaming read (flat memory at any file size), rows stored as raw JSON in chunks, no validation. `ImportBatch` carries `FileType` (inferred from file name) + progress counters (`TotalRows`/`ProcessedRows`/`FailedRows`).
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
│   ├── Jobs/ImportJobs.cs        # [TickerFunction] StageFile / TransformBatch
│   ├── Data/ImportContext.cs     # EF Core + SQLite (WAL), schema via GenerateCreateScript
│   ├── Staging/                  # ImportBatch, ImportRow, StagingLoader (ExcelDataReader), SampleData
│   ├── Domain/                   # Customer, Order, OrderLine, Product, StockLevel (normalized)
│   ├── Transform/
│   │   ├── IImportStrategy.cs    # chunk-based strategy contract
│   │   ├── ImportStrategyResolver.cs
│   │   ├── ImportRowExtensions.cs# row.Fail(...) / row.Succeed()
│   │   ├── Transformer.cs        # ProcessNextChunkAsync
│   │   ├── Orders/               # DTO + OrderRowValidator + OrderImportStrategy
│   │   └── Inventory/            # DTO + InventoryRowValidator + InventoryImportStrategy (upsert)
│   ├── db/                       # excelimport.sqlite (+ WAL files) lands here (gitignored)
│   └── sample-*.xlsx             # generated at runtime (gitignored)
├── NORMALIZATION.md              # the normalization guide
└── README.md
```

## Run it

```bash
cd ExcelImport
dotnet run --project src                        # 10k orders + 2.5k inventory demo
dotnet run --project src -- --rows 100000       # realistic file sizes
dotnet run --project src -- --reset             # wipe the SQLite db first
dotnet run --project src -- --reset --rows 100000
```

Expected output: jobs enqueued, live progress per batch (chunked transform visible), ~18 planted failures with FluentValidation messages, all reprocessed after correction, then verification queries (orders per customer, revenue per product, low stock).

## Scaling notes

- **Chunk sizes** (staging flush = 1000, transform = 1000) are the main knobs; raise for fewer round-trips, lower for less memory/lock time.
- SQLite works because of **WAL mode + busy timeout** (`Program.cs`), but it's single-writer: for real multi-job concurrency use SQL Server/Postgres — only the connection string changes.
- Batch counters (`ProcessedRows`/`FailedRows`) are cumulative work counters, updated atomically with `ExecuteUpdate` — safe to read from a dashboard while jobs run.
- Add `TickerQ.Dashboard` + `app.UseTickerQ()` dashboard options for a live UI; see tickerq.net/docs/dashboard.

## Adapting this to a real system

- New file type: add `Transform/<Type>/` (DTO + validator + strategy) and register it in the resolver.
- New job: add a `[TickerFunction]` method; schedule via `ITimeTickerManager<TimeTickerEntity>` (one-off/chained) or a `CronTickerEntity` (recurring).
- Trigger imports from an upload endpoint, folder watch, or cron instead of `Program.cs` seeding.
- Keep failed rows visible somewhere (a query, admin page, or the TickerQ dashboard) — that list *is* your data-quality feedback loop.
- Strategies are plain classes registered in DI; inject scoped services into them via the job class as needed.
