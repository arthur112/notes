# GridifyHttpQuery note

A .NET 10 minimal API that filters, sorts and pages a customers table with
**[Gridify](https://alirezanet.github.io/Gridify/)**. The same Gridify query is served two ways:

- **`GET /api/customers?page=…&pageSize=…&orderBy=…&filter=…`**: the classic query-string form;
- **`QUERY /api/customers`** with the Gridify query as a JSON body: the new **HTTP QUERY** method
  ([draft-ietf-httpbis-safe-method-w-body](https://datatracker.ietf.org/doc/draft-ietf-httpbis-safe-method-w-body/)).
  It is safe and idempotent like GET, so it can be retried and cached, but it carries a body. Long
  filters don't run into URL length limits or end up in proxy and access logs.

Both are documented in **[Scalar](https://scalar.com/)**. That needs one workaround (see
[OpenAPI and Scalar](#openapi-and-scalar)).

The customers and the response shape (`Paging<T>` = `{ count, data }`) match the mock in
`front-base/filtering`, so that front could call this API instead of its mock.

## Run it

```bash
cd GridifyHttpQuery
dotnet run --project src/GridifyHttpQuery.Api   # opens http://localhost:5103/scalar
```

On start the SQLite database (`customers.sqlite`, gitignored) is dropped, recreated and seeded with
12 customers. In Development, EF Core logs every SQL command, so you can see each Gridify query
become a `WHERE` / `ORDER BY` / `LIMIT`.

```bash
# QUERY: the Gridify query in the body
curl -X QUERY http://localhost:5103/api/customers \
  -H 'content-type: application/json' \
  -d '{"page":1,"pageSize":5,"orderBy":"creditLimit desc","filter":"segment=Enterprise,active=true"}'

# GET: the same query in the query string
curl -G http://localhost:5103/api/customers \
  --data-urlencode page=1 --data-urlencode pageSize=5 \
  --data-urlencode 'orderBy=creditLimit desc' \
  --data-urlencode 'filter=segment=Enterprise,active=true'

# unknown field → 400 validation problem
curl -X QUERY http://localhost:5103/api/customers \
  -H 'content-type: application/json' -d '{"page":1,"pageSize":5,"filter":"secret=1"}'
```

Some filters to try (see Gridify's [filtering syntax](https://alirezanet.github.io/Gridify/guide/filtering)):

| Filter                                         | Meaning                                                    |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `name=*stark/i\|email=*stark/i`                | name or email contains "stark", case-insensitive (`/i`)    |
| `country=United States,creditLimit>=100000`    | AND                                                        |
| `(createdAt>=2025-01-01,country=Sweden)\|active=false` | grouping + OR                                      |
| `segment=Enterprise\|segment=SMB`              | enum by name                                               |

`page` and `pageSize` are required (GridifyQuery declares them as non-nullable `int`).

## How it works

| Piece                                | Where                       | Role                                                                                                       |
| ------------------------------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `GridifyMapper<Customer>`            | `Program.cs`                | The fields a query may filter or sort on. `autoGenerateMappings` exposes every property; anything else is rejected. |
| `query.IsValid(mapper)`              | `Program.cs`                | Rejects unknown fields and malformed syntax up front → `400` `ValidationProblem` instead of a 500.        |
| `GridifyAsync(query, ct, mapper)`    | `Program.cs`                | `Gridify.EntityFramework`: filter → order → count → page, translated to SQL, returns `Paging<Customer>`. |
| `[AsParameters] GridifyQuery`        | GET endpoint                | Binds `page`, `pageSize`, `orderBy`, `filter` from the query string.                                      |
| `MapMethods("/", [HttpMethods.Query])` + `[FromBody] GridifyQuery` | QUERY endpoint | ASP.NET Core 10 has `HttpMethods.Query` and routes it like any other method; the body binds as JSON.   |
| `Results<Ok<Paging<Customer>>, ValidationProblem>` | shared handler | Typed results, so both endpoints document their 200 and 400 responses.                              |
| `QueryMethodTransformer`             | `QueryMethodTransformer.cs` | Puts the QUERY endpoints back into the OpenAPI document (below).                                           |

## OpenAPI and Scalar

ASP.NET Core 10 generates **OpenAPI 3.1**, which only knows the classic methods. Its generator
maps `GET`…`TRACE` and **skips** endpoints with any other method, so out of the box the QUERY
endpoint works but is missing from `/openapi/v1.json` and from Scalar.

**OpenAPI 3.2** adds a `query` field to the Path Item. The pieces needed to emit it already exist:

- ApiExplorer still produces an `ApiDescription` for the QUERY endpoint, with its body parameter,
  response types, name, summary and tags;
- Microsoft.OpenApi 2.x accepts `HttpMethod.Query` in `OpenApiPathItem.Operations` and writes it
  as a `query:` key;
- Scalar's path-item parser accepts `query` and renders a `QUERY` badge and a request client for it.

`QueryMethodTransformer` is a document transformer that loops over the QUERY descriptions and
builds each operation from them. It reads the id, summary and tags from endpoint metadata and gets
the body and response schemas from `context.GetOrCreateSchemaAsync`. It then adds the operation
under its path, next to the GET.

Caveats:

- the document still says `openapi: 3.1.1` but contains a 3.2 `query` operation. Scalar accepts it;
  a strict 3.1 validator or client generator may not;
- operation transformers don't run on these operations, and the schemas are inlined, not
  `$ref`s to `components`;
- paths with route constraints (`{id:int}`) would need the constraint stripped from the path key.

Once ASP.NET Core emits OpenAPI 3.2 with QUERY support itself, delete the transformer.

## Layout

```
GridifyHttpQuery/
├── GridifyHttpQuery.slnx
└── src/GridifyHttpQuery.Api/
    ├── Program.cs                  # DB reset, Gridify mapper, GET + QUERY endpoints, Scalar
    ├── CustomersDb.cs              # Customer entity, Segment enum (JSON string), seeded DbContext
    └── QueryMethodTransformer.cs   # adds QUERY operations to the OpenAPI document
```

## Stack

.NET 10 minimal API · Gridify.EntityFramework 2.20 · EF Core 10 (SQLite) ·
Microsoft.AspNetCore.OpenApi 10 · Scalar.AspNetCore 2.18
