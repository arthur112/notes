# ADR-001: Hybrid import pipeline (staging + normalization)

- **Status:** Accepted
- **Date:** 2026-08-03
- **Deciders:** project maintainer
- **Related:** [README.md](README.md), [NORMALIZATION.md](NORMALIZATION.md)

## Context

We receive Excel files in a *semi-controlled* format: wide sheets (30+ columns), repeated column groups (`Product1/Qty1/Price1`, `Product2/...`), and occasional invalid rows (bad dates, partial groups). Files can exceed 100k rows and are processed by background jobs (TickerQ), possibly concurrently and across restarts.

Historically, columns were mapped 1:1 into database tables — wide, redundant, integrity-free. We want the stored model normalized (3NF), but we must decide *how data gets there*.

## Decision

Use a **hybrid pipeline**: land every row **verbatim** in staging tables (`ImportBatches`/`ImportRows`, raw JSON, no validation), then a separate, chunked transform validates each row (FluentValidation) and maps it into **normalized** domain tables via a per-file-type strategy.

The staging layer is deliberately *not* normalized — it is a faithful copy of the input. The domain layer is deliberately normalized — it is the queryable truth.

## Alternatives considered

### A. Full normalization, direct import (rejected)

Parse each Excel row straight into 3NF tables, no staging.

- One malformed row aborts the file — or gets silently skipped, and nobody can tell afterwards.
- **No audit trail:** once a file is imported, the original received data is gone. "What did the sender actually send?" is unanswerable.
- **No reprocessing:** fixing a mapping bug or a bad row requires the original file to be resent; with staging, you fix the row in place and replay.
- **Failure cost at 100k rows:** a direct import is one long logical operation; a crash near the end means rolling back or guessing what landed. Chunked staging + status-per-row makes the pipeline resumable by construction.
- **Coupling:** the import endpoint becomes transactionally bound to the full domain schema; a schema change can break in-flight imports.

### B. Stay denormalized, 1:1 columns (rejected)

- The redundancy, update-anomaly, and query problems that motivated this note (see NORMALIZATION.md). A 4th product on an order is a schema change.

### C. Full flexibility: EAV or JSON-only storage (rejected)

- Storing *only* `(RowId, ColumnName, Value)` triplets or JSON documents keeps the input forever but pushes all structure enforcement to read time: no types, no constraints, painful queries. Flexibility on the write side, chaos on the read side.

## Why hybrid wins

| Concern | Direct normalization (A) | Hybrid (chosen) |
|---|---|---|
| Bad row in a 100k file | Aborts or vanishes | Quarantined in staging with an error message; the other 99,999 rows proceed |
| Audit trail | None | Complete — every received row is preserved |
| Reprocessing after a fix | Resend the file | Fix row in staging, reset to `Pending`, re-enqueue the job |
| Crash mid-file | Unknown state | Resume from row statuses; already-processed chunks are done |
| Read/query side | Normalized | Normalized — identical |
| File format evolution | Import breaks | Staging is schema-agnostic JSON; only the strategy changes |

The key insight: **"receiving data" and "having valid data" are two different responsibilities.** Staging owns the first, the transform owns the second. Each can fail, retry, and evolve independently.

## Consequences

**Positive**

- Nothing is ever lost; every import is fully replayable and auditable.
- Failures are isolated per row and visible (`Failed` + `Error`) — the failed-rows list doubles as the data-quality feedback loop to senders.
- Background jobs are naturally chunked and resumable; progress is observable via batch counters.
- Adding a file type touches only a new strategy folder.

**Negative / accepted costs**

- Data is stored twice (staging + domain). Accepted: staging is the quarantine zone and can be pruned on a retention policy if volume demands it.
- Mapping code must be written and maintained per file type. Accepted: that code exists in *any* design; here it is isolated in one strategy class.
- Two phases mean imported data is not visible until the transform runs (near-immediate with chained jobs, but not transactional with receipt).

**When direct normalization (A) would be fine:** small, fully trusted, machine-generated files with no audit or reprocessing requirements, where an import failure can safely mean "reject the whole file to the sender". That is not our situation.
