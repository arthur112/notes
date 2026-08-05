# Parallelism note

A self-contained .NET 10 app demonstrating **idiomatic parallel bulk-import**: wide (28-column) csv-like `.txt` files of up to **2M rows** are parsed and processed in parallel with **TPL Dataflow** inside a **[TickerQ](https://tickerq.net) background job**, bulk-copied into a flat staging table on **SQL Server (Docker)**, then **normalized set-based** into a relational model — all measured with **BenchmarkDotNet** across four file sizes.

## The scenario

Order exports with an embedded customer and a repeated product group (3 slots), generated at runtime at 10k / 100k / 1M / 2M rows:

```
OrderDate | CustomerName | CustomerCity | CustomerCountry | CustomerEmail |
Channel | Currency | SalesRep | Region | Warehouse |
Product1 | Sku1 | Qty1 | Price1 | Discount1 |   <- repeated x3 (15 columns)
ShipMethod | Priority | Notes
```

## Architecture

```
                    [TickerFunction("ImportFile")] — one TickerQ job per file
                    ┌────────────────────────────────────────────────────────┐
                    │  TPL Dataflow pipeline (Pipeline/ImportPipeline.cs)    │
                    │                                                        │
   file ──Sep──▶    │  TransformBlock<string[], StagedOrder>  MaxDOP = cores │
   (IRowParser      │      trim / validate / SHA-256 row hash                │
    strategy)       │  BatchBlock(10 000)                                    │
                    │  ActionBlock<StagedOrder[]>             MaxDOP = 1     │
                    │      SqlBulkCopy ─▶ StagedOrders (wide, no FKs)        │
                    └────────────────────────────────────────────────────────┘
                                        │ pipeline completion
                                        ▼
                    Normalizer.cs — set-based SQL, no row-by-row code:
                    INSERT ... SELECT DISTINCT      ─▶ Customers
                    INSERT ... SELECT ... JOIN      ─▶ Orders (Total computed)
                    3x INSERT ... SELECT (un-pivot) ─▶ OrderLines
```

- **Strategy pattern** (`Parsing/`): `IRowParser` resolved by file extension via `RowParserResolver`. Only `TxtOrderParser` exists (Sep, span-based SIMD parsing); a second format = one class + one resolver entry.
- **Backpressure**: every block has a `BoundedCapacity`, so the producer (Sep reader) suspends when downstream is busy — live memory stays flat at any file size.
- **Staging is a simple copy**: `StagedOrders` mirrors the file column-for-column (plus `RowHash`); `SqlBulkCopy` streams batches of 10k through a minimal `IDataReader` (`StagedOrderDataReader`) — no `DataTable` allocations.
- **Normalization is set-based**: correlation between staging and the new `Orders` rows goes through `Orders.SourceRowNumber` (a unique index on the staged row number) — no per-row lookups, idempotent (`WHERE NOT EXISTS`).
- **TickerQ**: jobs are persisted in the same SQL Server database (EF Core operational store). `ImportCompletion` (a `ConcurrentDictionary<string, TaskCompletionSource>`) lets the CLI/benchmark enqueue a job and `await` its completion.

## Layout

```
Parallelism/
├── docker-compose.yml          # SQL Server 2022 + healthcheck
├── src/
│   ├── Program.cs              # host setup + CLI (--generate / --run / --benchmark)
│   ├── Data/                   # ImportContext (EF Core SqlServer), DatabaseReset
│   ├── Domain/                 # StagedOrder (wide flat) + Customer/Order/OrderLine
│   ├── Parsing/                # IRowParser, RowParserResolver, TxtOrderParser (Sep), SampleData
│   ├── Pipeline/               # ImportPipeline, RowProcessor, SqlBulkFlush,
│   │                           # StagedOrderDataReader (IDataReader), Normalizer
│   ├── Jobs/                   # ImportJobs ([TickerFunction] ImportFile), ImportCompletion
│   ├── Benchmarks/             # ImportBenchmarks (BenchmarkDotNet), BenchmarkHost
│   └── data/                   # generated orders-*.txt files (gitignored)
└── README.md
```

## Run it

```bash
cd Parallelism
docker compose up -d                                           # SQL Server 2022 on :1433
dotnet run -c Release --project src -- --generate              # all four files into src/data/
dotnet run -c Release --project src -- --run src/data/orders-1m.txt --reset
dotnet run -c Release --project src -- --benchmark             # full BenchmarkDotNet table
```

## Benchmark

End-to-end (enqueue job → parse → process → bulk copy → normalize), BenchmarkDotNet in-process toolchain, 1 iteration per size, tables truncated between runs. Ryzen 7 9850X3D, SQL Server 2022 in Docker on the same machine:

| Rows      | Mean        | Staging   | Normalize | Allocated  |
|---------- |------------:|----------:|----------:|-----------:|
| 10,000    |    260.9 ms |    ~90 ms |   ~250 ms |   23.9 MB  |
| 100,000   |  2,032.8 ms |   ~0.6 s  |   ~1.4 s  |  221.6 MB  |
| 1,000,000 | 17,287.0 ms |   ~5.8 s  |  ~11.5 s  | 2,198.5 MB |
| 2,000,000 | 33,020.3 ms |   11.5 s  |   22.1 s  | 4,405.6 MB |

(Staging/normalize split from the job's log output; *Allocated* is cumulative managed allocation over the whole operation — live memory is bounded by the blocks' `BoundedCapacity`.)

Linear scaling from 100k upward (~60k rows/s end-to-end). Verification at 2M rows: 2,000,000 staged → 2,000,000 orders → 3,998,996 order lines across 12 customers.

## Scaling notes

- **Normalize dominates** (~2/3 of runtime): it's three scans of staging (customers, orders) plus three un-pivot scans for lines. Real systems would index staging, merge the un-pivots, or normalize with a TVP per batch.
- **Knobs**: `BatchSize` (10k), `processBlock.MaxDegreeOfParallelism` (cores), `insertBlock.BoundedCapacity` (in-flight batches). Parsing is *not* the bottleneck — the single-writer `ActionBlock` is deliberate; bulk copy saturates before cores do.
- The benchmark measures through the real TickerQ path (enqueue → `TaskCompletionSource` completion), so it includes job dispatch overhead — honest, and negligible next to seconds-scale work.
- `Job.Default.WithToolchain(InProcessEmitToolchain.Instance)` is what lets BenchmarkDotNet run inside the already-running host instead of spawning a child process.

## Adapting this to a real system

- New file format: implement `IRowParser`, register in `RowParserResolver` — the pipeline is format-agnostic (`string[]` in, domain rows out).
- New job: add a `[TickerFunction]` method; trigger from an upload endpoint, folder watch, or cron instead of the CLI.
- Swap the demo processing (`RowProcessor`) for real validation/enrichment; it's a pure function over `string[]`, so parallel safety comes free.
- For crash-safety, keep the staged rows (they're the audit trail) and record batch status in a small table — see the `ExcelImport` note for a full staging + reprocess flow.
