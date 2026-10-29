# VerticalSlice

A minimal, runnable mirror of a production **Vertical Slice Architecture** backend on .NET 10, reduced to two slices: **Fund CRUD**, and **SampleRecord**, a reference implementation of a rule-based write path (see [Write rules](#write-rules-samplerecord)). The shared plumbing (validation, typed errors, paging, exception handling, schema-per-test integration tests) is kept intact, so the note shows how one slice fits into the whole: request in, SQL Server row out, tests at both levels.

## The rules

- **One file per use case.** `Features/Fund/CreateFund.cs` is a static class holding its own `Request` / `Response` records and a static `Handle(Request, AppDbContext)` method. No MediatR, no repositories, no unit-of-work: the slice queries the shared `AppDbContext` directly.
- **Everything about a domain lives in its folder.** `FundEntity` (plain POCO), `FundEntityConfiguration` (`IEntityTypeConfiguration`, picked up by `ApplyConfigurationsFromAssembly`), the `Periodicity` enum and `FundEndpoints` (one `MapGroup("/api/funds")` mapping each `Handle`). `Program.cs` calls `app.MapFundEndpoints()`.
- **No layered projects.** Only `Data/` (the DbContext) and a few small cross-cutting folders (`ErrorHandling/`, `Validation/`, `Querying/`, `Json/`) are shared.
- **Validation is .NET 10 built-in** (`builder.Services.AddValidation()`). `Request` records carry `[property: ...]` attributes (built-in `Required`, `MaxLength`, plus custom `ValidEnum`, `JsonObject`), and invalid bodies get an automatic `400` `ValidationProblemDetails` before `Handle` runs. Cross-field or optional-but-not-blank rules go in `IValidatableObject` (see `UpdateFund.Request`).
- **Domain errors are typed.** `IHttpError` records (`NotFoundError`, `ConflictError`, `BadRequestError`, `ValidationError`) render themselves as RFC 9457 problem+json. Handlers are `Result`/`Maybe` pipelines (CSharpFunctionalExtensions) ending in `result.Match(onSuccess: ..., onFailure: error => error.ToHttpResult())`.
- **Unexpected exceptions** go to `GlobalExceptionHandler` (`IExceptionHandler`): `500` problem+json, with exception details only in Development. No try/catch in endpoints.
- **Lists go through Gridify behind our own contract.** `[AsParameters] ListQuery` (`page`, `pageSize`, `filter`, `orderBy`) in, `PagedResult<T>` (`{ data, count }`) out. `QueryableExtensions.ToPagedResultAsync` is the only place that calls Gridify, so the paging strategy can change without touching endpoints.
- **The schema belongs to grate, not EF.** `db/up/` (`0001_create_funds_table.sql`, `0002_store_periodicity_as_enum_name.sql`, `0003_create_sample_records_tables.sql`) is the source of truth, applied by the one-shot `src/Migrations` project. EF configuration must match the SQL exactly (for example `HasDefaultValueSql("NEWID()")`), because tests build their tables from the EF model.
- **JSON is source-generated** (`JsonSerializerIsReflectionEnabledByDefault=false`). Every request/response type is registered in `Json/AppJsonSerializerContext.cs`. Enums keep their C# names end to end: `"Monthly"` in JSON (`JsonStringEnumConverter<T>`, no naming policy), `'Monthly'` in the column (EF's built-in `HasConversion<string>()`), and back to `Periodicity.Monthly` on read.

## Structure

```
VerticalSlice/
├── AppHost/                    # Aspire: sql server → migrations (one-shot, must exit 0) → api
├── db/up/                      # grate run-once scripts: NNNN_description.sql
├── src/
│   ├── ServiceDefaults/        # OTel, service discovery, resilience, /health + /alive
│   ├── Migrations/             # grate in-process against ConnectionStrings__app
│   └── Api/
│       ├── Program.cs
│       ├── Data/               # AppDbContext (+ dynamic schema for tests)
│       ├── ErrorHandling/      # IHttpError records, GlobalExceptionHandler
│       ├── Validation/         # ValidEnum, JsonObject
│       ├── Querying/           # ListQuery, PagedResult, ToPagedResultAsync
│       ├── Json/               # source-gen context
│       ├── Features/Fund/      # the CRUD slice
│       └── Features/SampleRecord/  # mapper + named rules + customer settings
└── tests/Api.Tests/
    ├── FundValidatorTests.cs   # unit
    ├── FundTests.cs            # integration (in-proc API, per-test schema)
    ├── SampleRecordRulesTests.cs   # unit: each rule, ordering, OnChange
    ├── SampleRecordMapperTests.cs  # unit: a full Excel row leaves no column at default
    ├── SampleRecordTests.cs    # integration: create / update / import through the rules
    ├── ErrorHandlingTests.cs   # Aspire smoke + IHttpError shape
    └── Builders/               # test data builders
```

## Testing strategy (TUnit)

| Level | Class | How |
| --- | --- | --- |
| Unit | `SampleRecordRulesTests`, `SampleRecordMapperTests` | Rules are fired on a hand-built `RuleContext`; the mapper is called on a fully filled `SampleRecordExcelRow`. No host or DB. |
| Unit | `FundValidatorTests` | `RequestValidation.Validate(request)` wraps `Validator.TryValidateObject`, so the same attributes the pipeline uses are checked with no host or DB. |
| Integration | `FundTests`, `SampleRecordTests`, `HttpErrorResponseTests` | Inherit `DatabaseTestBase` (TUnit.AspNetCore `WebApplicationTest`). Each test creates its own SQL Server schema `test_<id>_test`, builds the tables from the EF model, runs the API in-process pointed at that schema (`Database:Schema`), and drops it afterwards (foreign keys, tables, then schema, since SQL Server has no `DROP SCHEMA ... CASCADE`). Tests run in parallel and can assert on counts. |
| Smoke | `ErrorHandlingTests` | `AppFixture` (TUnit.Aspire) starts the real AppHost once per test session (sql server, grate, api) and calls the running api over HTTP. Skipped when an existing test database is configured. |

**Test data builders:** every request DTO and seeded entity is built with `Builders/*Builder.Create().With...().Build()`, never with an inline `new Request(...)`. Tests only state the values that matter. The exception is raw JSON that a typed builder cannot produce (see the `permanentInformation`-only PUT test).

## Write rules (SampleRecord)

The target pattern for an entity whose create/update/import code is full of `if (type == A)` / `if (custId == "213")` branches. Every write goes through the same three steps, and nothing else assigns columns:

1. **Plain 1:1 mapping** (`SampleRecordMapper`, a C# 14 `extension(SampleRecordEntity target)` block). One `entity.MapFrom(source)` per source (create request, update request, Excel row), plus `entity.ToResponse()`. Hand-written assignments, no mapping library and no business logic; `Id`, `PublicId` and the audit columns are never written. A column the mapping forgets is not a build error, so `SampleRecordMapperTests` checks that a fully filled Excel row leaves no entity column at its default.
2. **Named rules** (`SampleRecordRules`). Each special case is an `EntityRule(Name, Kind, When, Apply)` that only reads and assigns columns. `Run` executes `OnCreate` rules on create, `OnChange` rules on update, then `Always` rules on both (a stable sort by kind, so declaration order holds within a kind and `Always` wins). `RuleContext.Changed(e => e.Type)` compares against the original values.
3. **Customer settings instead of hardcoded IDs** (`customer_settings`, keyed by `cust_id`). `Default...` columns fill an empty field on create, `Forced...` columns win on every save.

`SampleRecordWrite.ApplyRulesAsync` loads the customer's settings and runs the rules. `CreateSampleRecord` does `new` → `MapFrom` → rules; `UpdateSampleRecord` snapshots `db.Entry(entity).OriginalValues.ToObject()` → `MapFrom` → rules with that original; `ImportSampleRecords` loads all matching `ExternalKey`s in one query, sends each row down the create or update path, and saves once. PUT is a full replacement; `ExternalKey` is the business key and is not editable.

Audit columns (`IAuditable`) are stamped by `Data/AuditInterceptor` with a `TimeProvider`, never by the rules.

`RuleContext` is typed to `SampleRecordEntity`, so `RuleKind`, `RuleContext` and `EntityRule` stay in the slice folder instead of being shared: sharing them would need a generic abstraction this step does not want. No DDD yet (public setters, no factories), which is the next step.

## Adding a slice

1. `src/Api/Features/<Domain>/`: entity, `IEntityTypeConfiguration`, `DbSet` in `AppDbContext`.
2. `db/up/000N_create_<domain>_table.sql`, matching the configuration.
3. One file per use case, following `CreateFund.cs`. Register the request/response types in `AppJsonSerializerContext`.
4. `<Domain>Endpoints.cs` with a `MapGroup`, called from `Program.cs`.
5. `<Feature>RequestBuilder`s in `tests/Api.Tests/Builders/`, `<Domain>ValidatorTests` (unit) and `<Domain>Tests : DatabaseTestBase` (integration).

## Test database

The integration tests need a SQL Server, chosen by `AppFixture`:

- **Aspire (default):** the AppHost starts a SQL Server container, grate migrates the `app` database, and the tests take its connection string.
- **Existing database:** set `ConnectionStrings:TestDatabase` in `tests/Api.Tests/appsettings.Tests.json` (or the `ConnectionStrings__TestDatabase` environment variable, which wins over the file). The database must already exist, and the login needs `CREATE SCHEMA` / `CREATE TABLE` rights. grate is not involved, because each test builds its own schema from the EF model.

```json
{
  "ConnectionStrings": {
    "TestDatabase": "Server=localhost;Database=VerticalSliceTests;User Id=sa;Password=<pwd>;TrustServerCertificate=true"
  }
}
```

The file is committed with an empty value. Keep real passwords out of git by using the environment variable instead.

The per-test `Database:Schema` and the Aspire-provided `ConnectionStrings:app` are still passed to the in-process API from code, since they are only known at runtime.

## Run

Requires the .NET 10 SDK. Docker is needed for the AppHost, and for the integration tests unless you point them at an existing SQL Server.

```bash
dotnet build VerticalSlice.slnx

# unit tests only (no Docker)
dotnet test --solution VerticalSlice.slnx -- --treenode-filter "/*/*/FundValidatorTests/*"
dotnet test --solution VerticalSlice.slnx -- --treenode-filter "/*/*/SampleRecordRulesTests/*"
dotnet test --solution VerticalSlice.slnx -- --treenode-filter "/*/*/SampleRecordMapperTests/*"

# all tests (starts the AppHost: SQL Server container + grate + api)
dotnet test --solution VerticalSlice.slnx

# all tests against an existing SQL Server instead (no Docker, smoke test skipped):
# fill ConnectionStrings:TestDatabase in tests/Api.Tests/appsettings.Tests.json, or
ConnectionStrings__TestDatabase='Server=...' dotnet test --solution VerticalSlice.slnx

# run the app; the api's dashboard link opens Scalar at /scalar/v1
aspire run            # or: dotnet run --project AppHost
```

Try it:

```bash
curl -X POST localhost:<port>/api/funds -H 'content-type: application/json' \
     -d '{"name":"Alpha","periodicity":"Monthly"}'
curl 'localhost:<port>/api/funds?page=1&pageSize=10&orderBy=name desc'
curl -X POST localhost:<port>/api/sample-records -H 'content-type: application/json' \
     -d '{"externalKey":"SR-1","type":"A","custId":"CUST-1","amount":100,"orderDate":"2026-01-15"}'
```
