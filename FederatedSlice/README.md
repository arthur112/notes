# FederatedSlice

The federated React shell (`web/`) on a real .NET 10 back end (`src/Api`), started together by Aspire. The API is a vertical slice architecture: one file per use case, `TypedResults` unions as handler signatures (so the OpenAPI document is complete), built-in validation, a rule-based write path with per-customer settings, Gridify behind our own contract, per-route scopes and roles, grate-owned schema, TUnit with a schema per test. The shell signs in against Keycloak. Its slices are cut the same way as the front's domains, so each front domain has one back-end folder:

| Front (`web/src/`) | Back (`src/Api/Features/`) | Endpoints |
| --- | --- | --- |
| `domains/customers/`, `api/customers.ts` | `Customers/` | `GET /api/customers` (filtered list), `GET /api/customers/options` (picker) |
| `domains/orders/`, `api/orders.ts` | `Orders/` | `GET /api/orders`, `GET /api/orders/{orderNo}`, `GET /api/orders/{orderNo}/overview`, `POST /api/orders`, `PUT /api/orders/{orderNo}`, `GET /api/orders/reference-taken` |

```text
aspire run
  sql (SQL Server container) → migrations (grate: schema + demo data, must exit 0) → api ─┐
  keycloak (container, realm `federated` imported) ──────────────────────────────────────┴→ web (bun + Vite, :5173)
```

The browser only talks to Vite. Vite proxies `/api` to the api resource (`services__api__http__0`, set by `WithReference(api)`), so there is no CORS and the front uses relative URLs.

Topic docs, which follow one feature from the browser to SQL Server: [filtering](docs/filtering.md), [forms](docs/forms.md), [write rules](docs/rules.md), [OIDC](docs/oidc.md).

## The contract, point by point

The front's mocks are gone. Each thing they used to fake is now a rule on one side or the other:

| What | Front | Back |
| --- | --- | --- |
| **Lists** | `getPage` sends the Gridify query the filter definition builds (`page`, `pageSize`, `orderBy`, `filter`) and reads `{ data, count }`, Gridify's `Paging<T>`. | `[AsParameters] ListQuery` in, `PagedResult<T>` out. `ToPagedResultAsync` filters and orders the entities, counts, pages, then projects the page. |
| **Filter field names** | Each filter field names a Gridify field (`customer.customerNo`, `lineCount`, `isVip`). | Each list has a `GridifyMapper` from those names to entity paths. `ListOrders` maps them one by one: `lineCount` → `Lines.Count`, `total` → `Lines.Sum(...)`, both computed in SQL. `ListCustomers` uses the generated mappings, because the front uses the entity's own names. A field the mapper doesn't know is a `400`, not a `500`. |
| **Day ranges** | `createdAt>=2026-01-01T00:00:00Z,createdAt<=2026-01-31T23:59:59.999Z` (UTC instants). | `DateOnly` columns. The `UtcDay.Parse` converter takes the bound's UTC day, so both ends stay inclusive in any server time zone. |
| **Enums** | `STATUSES = ["Pending", "Paid", …]`, `SEGMENTS`. | C# names end to end: JSON (`JsonStringEnumConverter<T>`), the URL and filter (`status=Paid`), and the column (`HasConversion<string>()`). |
| **Numbers** | `ORD-100101`, `CUS-1001`. | Persisted computed columns over the identity (`'ORD-' + CAST(id …)`), with seeds 100101 / 1001. No number generation in code. |
| **Expected failures** | `sendJson` returns a 4xx problem+json as `{ ok: false, problem }`, and `submitTo` puts `errors` on the fields. | Built-in validation (`[Required]`, `[Range]`, `[MinLength]` on `OrderInput` / `OrderLine`) and the write path's checks (unknown customer, **credit hold** from `customers.is_on_hold`, reference already used) return a `400` with field `errors`. The named `OrderRules` never fail a save: they overwrite values silently. |
| **Auth** | `apiFetch` sends the Keycloak access token. A `401` goes back to the login page. `useShell().can(…)` hides and disables what the token doesn't allow. | `RequireScope(…)` per route, plus the `order-editor` role on writes. `401` / `403` are problem+json too (`UseStatusCodePages`). |
| **Error keys** | Field paths: `customer`, `lines[0].quantity`. | Built-in validation names C# members (`Lines[0].Quantity`), so `CustomizeProblemDetails` camelCases every key in `Program.cs`. |
| **Unexpected failures** | `getJson` throws on any non-2xx, so the route's error component renders inside the shell. For example, `/app1/orders/ORD-999999` gets a `404`. | `TypedResults.NotFound()` (bodiless; `UseStatusCodePages` adds the problem+json), or a `500` from `GlobalExceptionHandler`. |
| **Request log** | Recorded by the client as each list response arrives, so the Requests panel stays. | — |

Two things to know about .NET 10 validation, both found while building this note:

- Nested items are only validated through a `List<T>` (or another generic collection). With `OrderLine[] Lines`, the generator never registers `OrderLine`, so a line with quantity 0 passes.
- The keys don't follow the JSON naming policy, which is why `Program.cs` renames them.

### Write paths

`POST` and `PUT` take the same `OrderInput`, because the order form sends the same payload either way, but each handler has its own write path so create and update can evolve separately. Each resolves the customer, copies the input onto the entity (`OrderMapper`, a C# 14 extension block), then runs the named rules (`OrderRules`). The rules silently overwrite columns from per-customer settings (a prepaid customer's orders start Paid, a contract fixes the due date), so special cases live in one list instead of `if (customer == …)` branches ([write rules](docs/rules.md)). The credit hold and the reference uniqueness are checked around them. `PUT` replaces the whole order: the old lines become orphans, and EF deletes them. `UpdateOrder`, for example:

```csharp
public static async Task<Results<Ok<OrderDetail>, NotFound, ValidationProblem>> Handle(…)
{
    var order = await db.Orders.Include(o => o.Lines).FirstOrDefaultAsync(o => o.OrderNo == orderNo);
    if (order is null)
        return TypedResults.NotFound();

    var errors = await ApplyAsync(order, request, db, clock);
    if (errors.Count > 0)
        return TypedResults.ValidationProblem(errors);

    await db.SaveChangesAsync();
    return TypedResults.Ok(order.ToDetail());
}
```

### The order record page

Opening an order shows its record page (`/<app>/orders/$orderNo`), and **Edit** leads to the form (`…/edit`). The page reads `GET /api/orders/{orderNo}/overview` (`GetOrderOverview`), a read model of its own, so the form's `OrderDetail` stays the form's payload. The page has a hero titled by the order N° (customer, then customer N°, reference, booked and due dates, term), an **Order** section (terms, risk assessment, customer, lines, as label-left / value-right groups), a **Current state** section (status, payment, open exposure, credit headroom, a credit-hold banner), and a **Modifications** section (the latest three entries, the rest behind *View more*). Each section collapses from its heading. The log is **mocked on the front** (`order-overview/modifications.ts`): orders keep no history, so it is made up from the order's own data.

The risk grade is computed on the server from data it already holds. Each factor adds points, and the sum (capped at 5) is the position on the A–F scale (`risk-grade-scale.tsx`):

| Factor | Points |
| --- | --- |
| Customer on credit hold | 3 |
| Unpaid (Pending) after the due date | 1, or 2 past 30 days |
| Customer's unpaid orders vs. its credit limit | 1 from 50%, 2 from 90% |
| Unverified / inactive customer, Startup segment | 1 each |

## Sign-in and permissions

| Route | Scope (the app) | Role (the user) |
| --- | --- | --- |
| `GET /api/customers…` | `customers.read` | |
| `GET /api/orders…` | `orders.read` | |
| `POST` / `PUT /api/orders…` | `orders.write` | `order-editor` |

The realm has two users: `editor` / `editor` holds `order-editor`, and `viewer` / `viewer` doesn't. Both get the three scopes through the shell's client, so the viewer can read everything, but sees no **New order** or **Edit**, and gets a read-only order form. The API would answer `403` anyway. Without Keycloak, `dotnet user-jwts` mints tokens the API also accepts ([OIDC](docs/oidc.md)).

## Structure

```text
FederatedSlice/
├── AppHost/                  # sql → migrations → api; keycloak; web (AddViteApp + WithBun, :5173)
├── db/up/                    # grate: 0001 customers, 0002 orders + order_lines, 0003 demo data, 0004 customer_settings
├── keycloak/realms/          # realm `federated`: clients, scopes, role, users
├── src/
│   ├── ServiceDefaults/
│   ├── Migrations/           # grate in-process against ConnectionStrings__app
│   └── Api/
│       ├── Program.cs        # + validation keys camelCased, strict numbers, auth middleware order
│       ├── Auth/             # Scopes + RequireScope, Roles, OpenAPI security schemes, Scalar login
│       ├── Data/             # AppDbContext (+ per-test schema)
│       ├── ErrorHandling/    # GlobalExceptionHandler: Gridify exceptions → 400, the rest → 500
│       ├── Querying/         # ListQuery, PagedResult, ToPagedResultAsync, UtcDay
│       ├── Json/             # source-gen context
│       └── Features/
│           ├── Customers/    # ListCustomers, ListCustomerOptions, CustomerSettings
│           └── Orders/       # List/Get/Create/Update, IsReferenceTaken, OrderInput, OrderDetail, OrderMapper, OrderRules
├── tests/Api.Tests/          # TUnit: unit + per-test-schema integration + Aspire smoke
├── web/                      # the shell (see web/README.md)
└── docs/                     # how filtering, forms and OIDC work (docs/README.md)
```

## Tests

| Class | Level | What |
| --- | --- | --- |
| `UtcDayTests` | Unit | A day bound is its UTC day. |
| `OrderRulesTests` | Unit | Each rule on a hand-built `RuleContext`: fires or not, the value it writes, OnCreate skipped on update and OnChange on create. |
| `OrderMapperTests` | Unit | A fully filled input leaves no entity property at its default. |
| `OrdersAuthorizationTests` | Integration | `401` problem without a token, read scope per area, the scope × role matrix on create, the space-delimited `scope` claim. |
| `CustomersTests` | Integration | The front's own filter strings (multi-select with spaces, flags over several columns, inclusive day range, search + select), sorted options, settings columns (sorted), unknown field → `400`. |
| `OrderOverviewTests` | Unit + integration | The risk grade: a clean customer is an A, factors add up worst first and cap at F, a settled order is never past due, exposure over half the limit. The endpoint sums the customer's unpaid orders; unknown order → `404`. |
| `OrdersTests` | Integration | Create (number, Location), line errors on the form's paths, missing due date, credit hold, customer settings overriding the entered status and due date, a customer change dropping the old reference, reference uniqueness and `reference-taken`, `PUT` replacing lines, `404`s, filtering and sorting on `lineCount` / `total` / `customer.customerNo`. |
| `SmokeTests` | Aspire | The real AppHost: grate created and seeded the database (12 customers, 6 orders, 2 settings rows), and the api is healthy. |

Each integration test gets its own schema, built from the EF model, so `db/up` and the EF configurations must agree. They run against the Aspire SQL Server container, or against `ConnectionStrings:TestDatabase` when it is set. Tests carry real signed tokens (`TestTokens`), and the real JwtBearer validation runs on them. The AppHost also starts Keycloak and the shell during a full run, but the tests only wait for the api.

## Run

Requires the .NET 10 SDK, bun, and Docker (SQL Server and Keycloak containers). Keycloak is served at `https://localhost:8080` with the ASP.NET dev certificate, which must be trusted once (on Linux, also by .NET and Node):

```bash
dotnet dev-certs https --trust
export SSL_CERT_DIR="$HOME/.aspnet/dev-certs/trust:/etc/ssl/certs"   # Linux: before aspire run

aspire run                      # or: dotnet run --project AppHost
# dashboard → "web" opens the shell at http://localhost:5173 (sign in: editor/editor or viewer/viewer)
# "api" opens Scalar at /scalar/v1 (Authorize → Keycloak login, or paste a dotnet user-jwts token)

dotnet build FederatedSlice.slnx
dotnet test --solution FederatedSlice.slnx                                   # all (starts the AppHost)
dotnet test --solution FederatedSlice.slnx -- --treenode-filter "/*/*/OrderRulesTests/*"   # unit, no Docker (also OrderMapperTests, UtcDayTests)

cd web && bun run build && bun run lint && bun run test   # the front's own checks
```

Try it, signed in as `editor`:

- In App 1 → Orders, set Lines = 1 and Order total ≥ 100. The table now shows only the matching rows, because the API applies the filter.
- Open ORD-100104 (Umbrella): the record page grades it E (High) on the A–F scale and shows the credit-hold banner. Edit and save it: the form shows "Umbrella is on credit hold." under Customer.
- Open ORD-100102 (Globex, due 25-01-2026): unpaid for months, so it is a C. Edit and save it: it saves, and reopening it shows a due date of 10-02-2026, because Globex's contract fixes it at 30 days after the order date.
- Typing `PO-1001` as the reference of another order flags it before you save.

Sign out and in as `viewer`: no **New order** and no **Edit**, and the order form (still reachable at `…/edit`) is read-only.
