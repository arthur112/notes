# DataMasking note

Two self-contained .NET minimal APIs demonstrating **two levels at which sensitive data can be masked** — one enforced by the database engine, one enforced by the application. Same schema (`Employee` with `Email`, `Phone`, `Salary`), same fake auth (`X-User-Role: admin|user` header), so the two approaches are directly comparable.

| Solution | Level | Mechanism |
| --- | --- | --- |
| [`ConnectionStringSwitching/`](ConnectionStringSwitching/) | **Engine** | [SQL Server dynamic data masking](https://learn.microsoft.com/sql/relational-databases/security/dynamic-data-masking). Two connection strings with different SQL logins; a scoped provider picks one per request based on the caller's role. The unprivileged login sees masked values because the engine rewrites them. |
| [`InterceptorMasking/`](InterceptorMasking/) | **Application** | EF Core `IMaterializationInterceptor`. One connection string; properties marked `[Masked]` are overwritten in .NET right after materialization for non-admin users. |

## Layout

```
DataMasking/
├── docker-compose.yml               # SQL Server 2022 on localhost,1435 (shared by both)
├── ConnectionStringSwitching/       # solution 1: DDM + per-request connection string
│   └── src/
│       ├── Auth/FakeAuthMiddleware.cs          # X-User-Role header -> ClaimsPrincipal
│       ├── Data/ConnectionStringProvider.cs    # role -> "Admin" or "Masked" conn string
│       ├── Data/EmployeeContext.cs
│       ├── Migrations/0001-Setup.sql           # logins, users, MASKED WITH columns, GRANT UNMASK
│       └── Api/EmployeeEndpoints.cs            # /employees, /db-identity
├── InterceptorMasking/              # solution 2: EF materialization interceptor + value converter
│   └── src/
│       ├── Auth/                               # same fake auth + ICurrentUser + model cache key
│       ├── Data/MaskedAttribute.cs             # [Masked(MaskKind.Email|Phone|Zero)]
│       ├── Data/MaskingInterceptor.cs          # IMaterializationInterceptor (Email/Phone/Salary)
│       ├── Data/MaskingConverters.cs           # ValueConverter mask (Iban)
│       ├── Migrations/0001-Setup.sql           # plain table, no DDM
│       └── Api/EmployeeEndpoints.cs            # /employees, /employees/dto, /employees/raw
└── README.md
```

## Run it

```bash
cd DataMasking
docker compose up -d                          # wait for the healthcheck
```

### Solution 1 — engine-level (dynamic data masking)

```bash
dotnet run --project ConnectionStringSwitching/src   # port 5000
```

```bash
curl -H "X-User-Role: user"  http://localhost:5000/employees
#   "email": "aXXX@XXXX.com", "phone": "5XX-XX67", "salary": 0.0

curl -H "X-User-Role: admin" http://localhost:5000/employees
#   clear values

curl -H "X-User-Role: user"  http://localhost:5000/db-identity
#   { "appRole": "user", "sqlLogin": "mask_user" }
```

`/db-identity` runs `SELECT SUSER_SNAME()` on the request's own connection, proving the connection string really swapped: `admin` → `mask_admin` (holds `UNMASK`), anything else → `mask_user`.

### Solution 2 — application-level (EF interceptor)

```bash
dotnet run --project InterceptorMasking/src          # port 5000
```

```bash
curl -H "X-User-Role: user"  http://localhost:5000/employees
#   "email": "a***@***.com", "phone": "5XX-XX67", "salary": 0.0,
#   "iban": "BE**********7034"          <- masked by the VALUE CONVERTER

curl -H "X-User-Role: admin" http://localhost:5000/employees
#   clear values

curl -H "X-User-Role: user"  http://localhost:5000/employees/dto
#   DTO projection: NO entity is materialized, so the interceptor is bypassed
#   -> email/phone/salary come back CLEAR even for "user".
#   The value converter runs at column-read level -> iban stays MASKED.

curl -H "X-User-Role: user"  http://localhost:5000/employees/raw
#   CLEAR values — raw ADO.NET bypasses EF, so it bypasses both masks
```

### Two app-level mechanisms, side by side

Solution 2 masks `Email`/`Phone`/`Salary` with the **interceptor** and `Iban` with a **value converter**, so the difference is observable on the same row:

| | `IMaterializationInterceptor` | `ValueConverter` |
| --- | --- | --- |
| Hook | After the whole entity is populated | Per column, when EF reads the value from the data reader |
| Covers `Select(... new Dto ...)` projections | **No** — no entity is materialized | **Yes** |
| Covers entity reads (`ToList`, `Find`, lazy load) | Yes | Yes |
| Can depend on the current user | Naturally (scoped service injected per context) | Only via a conditional model + custom `IModelCacheKeyFactory` (models are cached; admin/non-admin need separate cache entries) |
| Write path | Masked value sits on the tracked entity — saving it persists the mask | Converter only masks provider→model; model→provider is pass-through, but a re-save of a masked entity still writes the mask |
| Multi-property / whole-entity rules | Easy (sees the whole instance) | One converter per property |

Rule of thumb within app-level masking: use a **converter** for single-column masks that must hold even in projections; use the **interceptor** when the rule needs the whole entity or must stay decoupled from the EF model. Neither is a security boundary — `/employees/raw` proves the data is clear the moment you leave EF.

## Trade-offs

| | Engine-level (DDM + login swap) | App-level (EF interceptor) |
| --- | --- | --- |
| Where masking is enforced | SQL Server, on the wire | .NET, after rows arrive |
| Bypass risk | None from the app's connection | Any path not going through the context (raw ADO, logs, `AsNoTracking` projections into DTOs[^1]) leaks clear data |
| Data on the wire / in memory | Masked end-to-end for unprivileged logins | Clear between DB and interceptor |
| Mask shapes | 4 fixed functions (`default`, `email`, `partial`, `random`) | Arbitrary .NET logic (per-user reveal, format-preserving, etc.) |
| Database portability | SQL Server / Azure SQL only | Any EF provider |
| Write path | Unaffected — masks are read-only, inserts/updates store real values | Interceptor masks the *tracked entity* — be careful not to save a masked instance back (use a separate write context or projection DTOs) |
| Cost | Two logins/users to provision and two pooled connections per app | Reflection per materialized entity (cache the property list for hot paths) |

Rule of thumb: prefer **engine-level** when the goal is "humans with query access must not see PII" (support accounts, read replicas, BI users). Use **app-level** when mask rules need business logic the engine can't express — and treat it as a UX feature, not a security boundary.

## Notes

- SQL Server runs on port **1435** to avoid clashing with Parallelism (1433) and StranglerTable (1434).
- Both solutions seed the same four employees; SQL setup scripts are idempotent — `docker compose down -v` for a clean slate.
- Solution 2 uses the `sa` login on purpose: there is exactly one connection string, which is the point — the masking decision happens purely in code.
- `IMaterializationInterceptor` pitfall: use **`InitializedInstance`** (after property values are populated), not `CreatedInstance` (after the constructor, *before* values are set) — masks written in `CreatedInstance` are silently overwritten by the real column values.
- `ValueConverter` pitfall: converters are part of the **cached model**. A converter that depends on the current user only works if you key the model cache by that user dimension — see `UserAwareModelCacheKeyFactory`, registered via `ReplaceService<IModelCacheKeyFactory, ...>`. Forget it and the first caller's mask rule applies to everyone.
- SQL script pitfall: a batch is compiled before it runs, so an `ALTER TABLE ... ADD column` is invisible to statements later in the *same* batch on existing databases. The script uses `GO` separators and `SchemaRunner` splits batches on them.

[^1]: `Select(e => new EmployeeDto { ... })` projects into a non-entity DTO, which never goes through materialization interception. Project into the entity first, mask in the projection — or mask the column with a value converter, as solution 2 does for `Iban`.
