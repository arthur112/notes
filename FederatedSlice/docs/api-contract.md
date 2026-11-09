# API contract: generated front types

The front's API types (`web/src/api/orders.ts`, `customers.ts`) are written by hand to match the C# records. Nothing checks that they still match: `getJson` ends in `response.json() as T`, so if a property is renamed on the server, the page renders `undefined` without any error. The plan is to generate them from the API's OpenAPI document instead, in three steps:

| Step | What | Status |
| --- | --- | --- |
| 1 | Make the OpenAPI document complete and well named | **Done** |
| 2 | Get the document into a file the front can build from | Planned (notes below) |
| 3 | Generate the TS types (and optionally zod schemas) from that file | Planned (notes below) |

Paths are relative to the note's root (`FederatedSlice/`).

## 1. A complete document (done)

The document is served at `/openapi/v1.json` (Scalar reads it at `/scalar/v1`). Three things kept it from being usable, and all three are fixed:

| Problem | Fix |
| --- | --- |
| Handlers returned `Task<IResult>`, so 6 of the 8 endpoints had no response schema | Handlers declare a `TypedResults` union: `Task<Results<Ok<OrderDetail>, NotFound, ValidationProblem>>`. Each member describes itself: 200/201 with its schema, 404, and 400 with `HttpValidationProblemDetails`. Endpoints that can't fail return their type directly (`Task<PagedResult<OrderRow>>`). The Result/`IHttpError` pipeline that used to produce an `IResult` is gone. |
| Every nested response record was named `Response`, and the schema id is the type name, so the names collided | **Rule: a slice's response record is named after what it holds, never `Response`.** `ListOrders.OrderRow`, `ListCustomers.CustomerRow`, `ListCustomerOptions.CustomerOption`, `GetOrderOverview.OrderOverview`. Generics follow: `PagedResultOfOrderRow`. The JSON source-gen context no longer needs `TypeInfoPropertyName` either. |
| Numbers were `"type": ["integer", "string"]`, because the web JSON defaults also read numbers from strings | `NumberHandling = JsonNumberHandling.Strict` in `Program.cs`. The front always sends real numbers. |

The document now has 14 schemas: `OrderRow`, `CustomerRow`, `CustomerOption`, `OrderOverview` (+ `CustomerFacts`, `RiskAssessment`), `OrderDetail`, `OrderInput`, `OrderLine`, `OrderStatus`, `Segment`, the two `PagedResultOf…`, and `HttpValidationProblemDetails`. Enums are their C# names, `DateOnly` is `string` with `format: date`, `string?` is nullable, and constructor parameters are `required`.

## 2. The document as a file (planned)

Build from a committed file, not from a running API: Aspire assigns the API's port dynamically, and a build shouldn't depend on what is deployed at that moment.

### Same repo (this note)

Generate the document at build time with `Microsoft.Extensions.ApiDescription.Server`, in `src/Api/Api.csproj`:

```xml
<PackageReference Include="Microsoft.Extensions.ApiDescription.Server" />  <!-- version in Directory.Packages.props -->

<PropertyGroup>
  <OpenApiDocumentsDirectory>../../web</OpenApiDocumentsDirectory>
  <OpenApiGenerateDocumentsOptions>--file-name openapi</OpenApiGenerateDocumentsOptions>
</PropertyGroup>
```

`dotnet build` then writes `web/openapi.json`. Commit it: a contract change shows up as a diff in the PR that causes it.

Not tried yet: the generator boots the app's startup without Aspire, so `AddSqlServerDbContext` may throw because there is no connection string. If it does, skip that registration when `Assembly.GetEntryAssembly()?.GetName().Name == "GetDocument.Insider"`.

### Separate repos

The API repo owns and publishes the contract, and the front pins a version of it.

- **API repo:** generate the document into the repo (e.g. `contracts/openapi.json`) and commit it. In CI, fail on breaking changes against `main` with [oasdiff](https://github.com/oasdiff/oasdiff): `oasdiff breaking base.json contracts/openapi.json --fail-on ERR` (removed field, optional → required, removed enum value…). On release, publish the document tagged with the API version.
- **Front repo:** two ways to consume it:

| | Vendor the document | npm package of generated types |
| --- | --- | --- |
| How | `api:pull` copies `openapi.json` at a pinned tag, then step 3 runs locally | API CI runs step 3 and publishes `@company/orders-api-contract` to the private registry |
| Update | `bun run api:pull` → regenerate → PR | Bump the version (Renovate/Dependabot) |
| Infra | Read access to the document | A private npm registry |
| Contract diff in the front PR | Yes, the JSON diff | Only through the package's changelog |
| When | One front | Several fronts on the same API |

**Deploy skew.** With separate repos, the front and the API deploy independently, so the types only guarantee the API version the front was built against. Additive changes are safe. A breaking change needs a new version (`/v2`, or a new field next to the old one), and the old one is removed only once the front has moved. This is also where runtime validation (below) becomes worth having.

## 3. Generated TS types (planned)

```sh
cd web && bun add -d openapi-typescript
```

```json
"api:types": "openapi-typescript openapi.json -o src/api/schema.gen.ts --enum-values"
```

Commit `schema.gen.ts`, and in CI fail if regenerating it produces a diff (`bun run api:types && git diff --exit-code`).

`api/*.ts` keep their exported names and become aliases, so nothing that imports them changes:

```ts
import type { components } from "./schema.gen";
type Schemas = components["schemas"];

export type Order = Schemas["OrderRow"];
export type Customer = Schemas["CustomerRow"];
export type CustomerRef = Schemas["CustomerOption"];
export type OrderInput = Schemas["OrderInput"];
export type OrderDetail = Schemas["OrderDetail"];
export type OrderOverview = Schemas["OrderOverview"];
export type OrderStatus = Schemas["OrderStatus"];
```

Things to check when doing it:

- **Enum value arrays.** `STATUSES`, `SEGMENTS` and `COUNTRIES` are runtime values: the zod filters and the selects use them. `--enum-values` should export arrays for the enum schemas. Check the output. If it doesn't, keep the hand-written arrays with `satisfies readonly OrderStatus[]`. `COUNTRIES` is a plain `string` on the API, so it stays hand-written either way.
- **Lists.** `getPage` returns gridify-client's `Paging<T>`, which has the same `{ data, count }` shape as `PagedResultOf…`. Keep `Paging<Order>`, with `Order` now the generated row.
- **Input vs. output.** `OrderInput.reference` and `dueDate` are nullable in the document (C# `string?` / `DateOnly?`), while the front's type has `reference?: string`. Line them up when switching.
- **Skip `openapi-fetch`.** It types calls by path, but `http.ts` already handles the token, the 401 redirect and problem+json, and the query hooks only call `fetchX` functions.

### Optional: runtime validation with zod

Types are a compile-time promise. To also check what actually arrives (most useful with separate deploys), generate zod schemas from the same document with `@hey-api/openapi-ts` and its zod plugin, instead of writing them by hand. Then pass the schema to `getJson` / `getPage`:

```ts
export async function getJson<S extends z.ZodType>(url: string, schema: S): Promise<z.infer<S>> {
  // … same fetch and error handling …
  return schema.parse(await response.json());
}
```

Validate only. Don't transform. `DateOnly` values stay `YYYY-MM-DD` strings: they compare with `<`, go back into forms and URLs unchanged, and keep TanStack Query's structural sharing working (`Date` objects would get new identities on every refetch). In production, consider reporting a failed parse and returning the data anyway, so that one unknown enum value doesn't break the whole list.
