# FederatedSlice

The federated React shell (`web/`) on a real .NET 10 back end (`src/Api`), started together by Aspire. The API is a vertical slice architecture: one file per use case, Result/`IHttpError` pipelines, built-in validation, Gridify behind our own contract, grate-owned schema, TUnit with a schema per test. Its slices are cut the same way as the front's domains, so each front domain has one back-end folder:

| Front (`web/src/`) | Back (`src/Api/Features/`) | Endpoints |
| --- | --- | --- |
| `domains/customers/`, `api/customers.ts` | `Customers/` | `GET /api/customers` (filtered list), `GET /api/customers/options` (picker) |
| `domains/orders/`, `api/orders.ts` | `Orders/` | `GET /api/orders`, `GET /api/orders/{orderNo}`, `POST /api/orders`, `PUT /api/orders/{orderNo}`, `GET /api/orders/reference-taken` |

```text
aspire run
  sql (SQL Server container) → migrations (grate: schema + demo data, must exit 0) → api → web (bun + Vite)
```

The browser only talks to Vite. Vite proxies `/api` to the api resource (`services__api__http__0`, set by `WithReference(api)`), so there is no CORS and the front uses relative URLs.

Topic docs, which follow one feature from the browser to SQL Server: [filtering](docs/filtering.md), [forms](docs/forms.md), [OIDC](docs/oidc.md) (design only).

## The contract, point by point

The front's mocks are gone. Each thing they used to fake is now a rule on one side or the other:

| What | Front | Back |
| --- | --- | --- |
| **Lists** | `getPage` sends the Gridify query the filter definition builds (`page`, `pageSize`, `orderBy`, `filter`) and reads `{ data, count }`, Gridify's `Paging<T>`. | `[AsParameters] ListQuery` in, `PagedResult<T>` out. `ToPagedResultAsync` filters and orders the entities, counts, pages, then projects the page. |
| **Filter field names** | Each filter field names a Gridify field (`customer.customerNo`, `lineCount`, `isVip`). | Each list has a `GridifyMapper` from those names to entity paths. `ListOrders` maps them one by one: `lineCount` → `Lines.Count`, `total` → `Lines.Sum(...)`, both computed in SQL. `ListCustomers` uses the generated mappings, because the front uses the entity's own names. A field the mapper doesn't know is a `400`, not a `500`. |
| **Day ranges** | `createdAt>=2026-01-01T00:00:00Z,createdAt<=2026-01-31T23:59:59.999Z` (UTC instants). | `DateOnly` columns. The `UtcDay.Parse` converter takes the bound's UTC day, so both ends stay inclusive in any server time zone. |
| **Enums** | `STATUSES = ["Pending", "Paid", …]`, `SEGMENTS`. | C# names end to end: JSON (`JsonStringEnumConverter<T>`), the URL and filter (`status=Paid`), and the column (`HasConversion<string>()`). |
| **Numbers** | `ORD-100101`, `CUS-1001`. | Persisted computed columns over the identity (`'ORD-' + CAST(id …)`), with seeds 100101 / 1001. No number generation in code. |
| **Expected failures** | `sendJson` returns a 4xx problem+json as `{ ok: false, problem }`, and `submitTo` puts `errors` on the fields. | Built-in validation (`[Required]`, `[Range]`, `[MinLength]` on `OrderInput` / `OrderLine`) and the `OrderWrite` rules (unknown customer, **credit hold** from `customers.is_on_hold`, reference already used) all return a `400` with field `errors`. |
| **Error keys** | Field paths: `customer`, `lines[0].quantity`. | Built-in validation names C# members (`Lines[0].Quantity`), so `CustomizeProblemDetails` camelCases every key in `Program.cs`. |
| **Unexpected failures** | `getJson` throws on any non-2xx, so the route's error component renders inside the shell. For example, `/app1/orders/ORD-999999` gets a `404`. | `NotFoundError`, or a `500` from `GlobalExceptionHandler`. |
| **Request log** | Recorded by the client as each list response arrives, so the Requests panel stays. | — |

Two things to know about .NET 10 validation, both found while building this note:

- Nested items are only validated through a `List<T>` (or another generic collection). With `OrderLine[] Lines`, the generator never registers `OrderLine`, so a line with quantity 0 passes.
- The keys don't follow the JSON naming policy, which is why `Program.cs` renames them.

### One write path

`POST` and `PUT` take the same `OrderInput`, because the order form sends the same payload either way. `OrderWrite.ApplyAsync` runs the rules that need the database, then copies the input onto the entity. `PUT` replaces the whole order: the old lines become orphans, and EF deletes them. `CreateOrder` and `UpdateOrder` are only the pipeline around it:

```csharp
var result = await Maybe<OrderEntity>
    .From(await db.Orders.Include(o => o.Lines).FirstOrDefaultAsync(o => o.OrderNo == orderNo))
    .ToResult((IHttpError)new NotFoundError())
    .Bind(order => OrderWrite.ApplyAsync(order, request, db))
    .Tap(_ => db.SaveChangesAsync())
    .Map(OrderDetail.From);
```

## Not built yet

- **Auth.** The shell has no login yet, so the routes are open. [docs/oidc.md](docs/oidc.md) has the design (scopes and roles on the API, a PKCE client in the shell) and the code to start from.

## Structure

```text
FederatedSlice/
├── AppHost/                  # sql → migrations → api → web (AddViteApp + WithBun)
├── db/up/                    # grate: 0001 customers, 0002 orders + order_lines, 0003 demo data
├── src/
│   ├── ServiceDefaults/
│   ├── Migrations/           # grate in-process against ConnectionStrings__app
│   └── Api/
│       ├── Program.cs        # + validation keys camelCased
│       ├── Data/             # AppDbContext (+ per-test schema)
│       ├── ErrorHandling/    # NotFoundError, ValidationError; Gridify exceptions → 400
│       ├── Querying/         # ListQuery, PagedResult, ToPagedResultAsync, UtcDay
│       ├── Json/             # source-gen context
│       └── Features/
│           ├── Customers/    # ListCustomers, ListCustomerOptions
│           └── Orders/       # List/Get/Create/Update, IsReferenceTaken, OrderInput, OrderDetail, OrderWrite
├── tests/Api.Tests/          # TUnit: unit + per-test-schema integration + Aspire smoke
├── web/                      # the shell (see web/README.md)
└── docs/                     # how filtering, forms and OIDC work (docs/README.md)
```

## Tests

| Class | Level | What |
| --- | --- | --- |
| `UtcDayTests` | Unit | A day bound is its UTC day. |
| `CustomersTests` | Integration | The front's own filter strings (multi-select with spaces, flags over several columns, inclusive day range, search + select), sorted options, unknown field → `400`. |
| `OrdersTests` | Integration | Create (number, Location), line errors on the form's paths, credit hold, reference uniqueness and `reference-taken`, `PUT` replacing lines, `404`s, filtering and sorting on `lineCount` / `total` / `customer.customerNo`. |
| `SmokeTests` | Aspire | The real AppHost: grate created and seeded the database (12 customers, `CUS-1001` = Acme Corp). |

Each integration test gets its own schema, built from the EF model, so `db/up` and the EF configurations must agree. They run against the Aspire SQL Server container, or against `ConnectionStrings:TestDatabase` when it is set.

## Run

Requires the .NET 10 SDK, bun, and Docker (for the SQL Server container).

```bash
aspire run                      # or: dotnet run --project AppHost
# dashboard → "web" opens the shell; "api" opens Scalar at /scalar/v1

dotnet build FederatedSlice.slnx
dotnet test --solution FederatedSlice.slnx                                   # all (starts the AppHost)
dotnet test --solution FederatedSlice.slnx -- --treenode-filter "/*/*/UtcDayTests/*"   # unit only, no Docker

cd web && bun run build && bun run lint && bun run test   # the front's own checks
```

Try it: in App 1 → Orders, set Lines = 1 and Order total ≥ 100. The table now shows only the matching rows, because the API applies the filter. Open ORD-100104 (Umbrella) and save it: the form shows "Umbrella is on credit hold." under Customer. Typing `PO-1001` as the reference of another order flags it before you save.
