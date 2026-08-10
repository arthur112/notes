# StranglerTable note

A self-contained .NET minimal API demonstrating the **strangler-fig migration of a wide, unnormalised legacy table** (44 columns) to a normalised model — **without changing the legacy schema first**, so the migration can happen table-by-table instead of in one big bang.

The API and the domain model (`Order` / `Customer` / `Address` / `Fulfillment` / `Audit`) are written once and never change. Two interchangeable persistence strategies sit between the domain and the legacy table, selectable per request:

| Route prefix | Strategy | Mechanism |
| --- | --- | --- |
| `/split/orders` | **A — EF Core table splitting** | `OwnsOne(...)` maps the normalised object graph straight onto the wide `LegacyOrders` table. **No mapper code.** |
| `/acl/orders` | **B — anti-corruption layer** | Flat row entity (`LegacyOrderRow`) + hand-written mappers (`LegacyOrderMapper`). Full control for messy mappings. |
| `/compare/{id}` | — | Reads through both strategies and reports whether the results are identical. |

When a slice of the table is finally normalised physically (phase 2), only the mapping layer changes — see below.

## Layout

```
StranglerTable/
├── docker-compose.yml              # SQL Server 2022 on localhost,1434
├── src/
│   ├── Program.cs                  # bootstrap, schema runner, seeding
│   ├── Migrations/
│   │   ├── 0001-CreateLegacyOrders.sql   # the 44-column legacy table
│   │   └── 0002-SplitBillingAddresses.sql# phase 2: extract Addresses table
│   ├── Domain/                     # normalised model + IOrderStore (no EF deps)
│   ├── Split/                      # strategy A: SplitDbContext (owned types)
│   ├── Acl/                        # strategy B: row entities + mappers + AclDbContext
│   ├── Api/OrderEndpoints.cs       # /split/orders, /acl/orders, /compare/{id}
│   └── Data/SchemaRunner.cs        # creates DB, applies idempotent .sql scripts
└── README.md
```

## Run it (phase 1 — untouched legacy table)

```bash
cd StranglerTable
docker compose up -d                # wait for the healthcheck
dotnet run --project src            # creates DB, applies 0001, seeds 2 orders
```

Then:

```bash
curl http://localhost:5000/split/orders      # via EF table splitting
curl http://localhost:5000/acl/orders        # via the anti-corruption layer
curl http://localhost:5000/compare/1         # { "equal": true, ... }
```

Both strategies read and write the **same rows** in the same wide table, so you can POST through one and GET through the other.

## Run it (phase 2 — first table actually split out)

```bash
docker compose down -v              # reset (or keep data — scripts are idempotent)
docker compose up -d
dotnet run --project src            # with "Mapping": { "Phase": 2 } in appsettings.json
```

With `Mapping:Phase = 2`, the startup additionally applies `0002-SplitBillingAddresses.sql`: billing address columns are moved to a real `Addresses` table and dropped from `LegacyOrders`. The cost per strategy:

- **A (table splitting):** one-line change in `SplitDbContext` — `a.ToTable("Addresses")` for the billing owned type (plus unprefixed column names). Domain, API, queries: untouched.
- **B (ACL):** new row shapes (`OrderRowV2` + `BillingAddressRow`) and a new mapper (`OrderMapperV2`). The domain and API are still untouched, but you maintain the mapping by hand.

Repeat per table slice until the legacy table is gone.

## Trade-offs

| | A — table splitting / owned types | B — anti-corruption layer |
| --- | --- | --- |
| Mapping code | Declarative fluent config only | Hand-written mapper per phase |
| Change-tracking, partial updates | Built-in | You reimplement it |
| Messy/conditional legacy mapping | Hard to express | Anything goes |
| Domain purity | Domain classes double as EF entities | Domain fully isolated |
| Phase-2 cost | Change `ToTable` mapping | Rewrite the affected mapper slice |

Rule of thumb: start with **A**; drop to **B** only for the tables whose legacy mapping is too ugly for owned types. Both can coexist per table, as this note shows.

## Notes

- The legacy table keeps unmapped junk columns (`LegacyCode`, `LegacyFlag`, `LegacyDiscount`) to prove EF doesn't need to map every column.
- `Mapping:Phase` is read once at startup; both contexts are registered together, so switching phases never requires code changes — only config + the SQL script.
- SQL Server runs on port **1434** to avoid clashing with the Parallelism note (1433).
