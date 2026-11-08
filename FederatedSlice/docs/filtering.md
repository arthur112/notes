# Filtering

A filtered list (Orders, Customers) is one loop:

```text
control change ──► URL search ──► route validateSearch (Zod) ──► settled search
     ▲                                                               │
     │                                                  loader + useQuery (key = search)
     │                                                               │
  table / bar re-render ◄── { data, count } ◄── API ◄── Gridify query (page, pageSize, orderBy, filter)
```

The URL is the **only** filter state. No `useState` holds a filter, so reload, Back/Forward and a shared link all show the same list.

## 1. One definition per entity (front)

`web/src/domains/orders/filter.ts` lists the fields. Each field is one call to a builder from `web/src/shared/filtering/fields.tsx`:

```ts
export const ordersFilter = defineFilter({
  fields: {
    q: searchField({ fields: ["orderNo", "customer.name"], … }),
    status: selectField({ field: "status", source: { options: STATUSES }, schema: z.enum(STATUSES), … }),
    customer: selectField({ field: "customer.customerNo", source: { useOptions: useCustomerOptions }, … }),
    lineCount: selectField({ field: "lineCount", source: { options: LINE_COUNTS }, schema: z.number(), … }),
    total: numberRangeField({ field: "total", … }),
    created: dateRangeField({ field: "createdAt", … }),
  },
  sortFields: SORT_FIELDS, // column id → Gridify field: { customer: "customer.name", … }
});
```

A builder returns a complete `FilterFieldSpec` (`shared/filtering/definition.ts`):

| Part | What it does |
| --- | --- |
| `schema` | Parses the URL value into the *settled* value. It is lenient: a bad value (`status=bogus`, `total={"min":"abc"}`) means "no constraint", never a route error. |
| `apply` | Adds the field's Gridify conditions. It is only called when the field is set. |
| `control` + `toControlValue` | The control in the bar and what it shows for the settled value. |
| `placement` | `inline` (the search box) or `popover` (behind the **Filters** button). |
| `field` (the builder argument) | The **Gridify field name** sent to the API. The back end must map exactly this name (see [step 4](#4-the-mapper-back)). |

The query half (schema + `apply`) is in `shared/filtering/field-queries.ts`, apart from the controls, so `field-queries.test.ts` checks every field's Gridify output without rendering anything.

`defineFilter` puts the fields together into:

- `schema`: the route's `validateSearch`, plus `page`, `pageSize` and `sort` (also lenient).
- `toGridifyQuery(search)`: the `{ page, pageSize, orderBy, filter }` sent to the API. Conditions follow the field declaration order.
- `cleared` / `hasFilters`: used by the **Clear filters** button.

| Builder | URL value | Gridify filter |
| --- | --- | --- |
| `searchField` | `q=acme` | `(orderNo=*acme\|customer.name=*acme)`. A number uses `=` instead of `=*` (contains). |
| `selectField` | `status=Paid` | `status=Paid` |
| `multiSelectField` | `countries=["Germany","Sweden"]` | `(country=Germany\|country=Sweden)` |
| `booleanSelectField` | `active=true` | `active=true` |
| `flagsField` | `flags=["vip","released"]` | `(isVip=true\|isOnHold=false)`. Several boolean columns, any of them matching. |
| `numberRangeField` | `total={"min":"100","max":"500"}` | `total>=100,total<=500` |
| `dateRangeField` | `created={"from":"01-01-2026","to":"31-01-2026"}` | `createdAt>=2026-01-01T00:00:00Z,createdAt<=2026-01-31T23:59:59.999Z` |

`,` is AND and `|` is OR. Date bounds are UTC instants, so every viewer sends the same query whatever their time zone.

## 2. URL → query → request (front)

The app's page owns the route. The domain's list doesn't know its route (one `OrdersList` serves `/app1/orders` and `/app2/orders`), so the page passes `search` and `onPatch` in (`web/src/apps/app1/orders/pages.tsx`):

```tsx
<OrdersList
  search={listRoute.useSearch()}
  onPatch={(changes) => void navigate({ search: (prev) => ({ ...prev, page: undefined, ...changes }) })}
/>
```

- **Each patch is a navigation**, so it adds a history entry and Back undoes a filter. A new filter resets `page`. A pagination patch sets `page` itself.
- **Typed controls are debounced inside the control.** `useBufferedValue` (`shared/hooks/use-buffered-value.ts`) keeps a local draft and commits after 350 ms or on blur. A pick from a select commits right away, so one change makes one navigation and one request.
- **The route parses the URL.** `ordersListRoute` (`domains/orders/use-orders.ts`) is spread into every app's list route and supplies `validateSearch: ordersFilter.schema`, `loaderDeps: search` and a `loader`. The loader starts the query **without awaiting it**. The page renders at once with its own loading state, and the request runs in parallel with the download of the page's lazy chunk.
- **React Query caches by the settled search**: `queryKey: ["orders", search]`, `staleTime: 30_000`, `keepPreviousData`. Going back to an earlier filter is served from the cache, and the previous rows stay on screen while the next ones load. Both apps use the same key, so they share the cache.
- **The table only holds state.** `DataTable` uses TanStack Table with `manualSorting` and `manualPagination`. A header click becomes `onPatch({ sort })` and a page change becomes `onPatch({ page, pageSize })`. Nothing is sorted or sliced in the browser. Page 1 and the default page size stay out of the URL, so `/orders` and `/orders?page=1` are one cache entry.
- **The request** is `getPage` (`web/src/api/http.ts`): `GET /api/orders?page=…&pageSize=…&orderBy=…&filter=…`, proxied by Vite to the API. Each response is also recorded in the list's **Requests** panel.

## 3. The contract (both sides)

`ListQuery` in, `PagedResult<T>` out (`src/Api/Querying/`):

```http
GET /api/orders?page=1&pageSize=5&orderBy=total desc&filter=status=Paid,total>=100
→ 200 { "data": [ { "orderNo": "ORD-100106", "customer": "Hooli", "status": "Paid", "total": 1240.00, "createdAt": "2026-03-01" } ], "count": 2 }
```

`{ data, count }` is Gridify's `Paging<T>` shape, so the front's types use `Paging<Order>` from `gridify-client`.

## 4. The mapper (back)

Each list slice declares which Gridify field names it accepts, mapped to entity paths. `src/Api/Features/Orders/ListOrders.cs`:

```csharp
private static readonly IGridifyMapper<OrderEntity> Mapper = new GridifyMapper<OrderEntity>()
    .AddMap("orderNo", o => o.OrderNo)
    .AddMap("customer.name", o => o.Customer.Name)
    .AddMap("customer.customerNo", o => o.Customer.CustomerNo)
    .AddMap("status", o => o.Status)
    .AddMap("lineCount", o => o.Lines.Count)
    .AddMap("total", o => o.Lines.Sum(l => l.Quantity * l.UnitPrice))
    .AddMap("createdAt", o => o.CreatedAt, UtcDay.Parse);
```

- **Field names are the contract.** The front's `field:` values and these keys must match. The mapper is also an allowlist: any other name throws a Gridify exception, which `GlobalExceptionHandler` turns into a `400` problem (`"Mapping 'bogus' not found"`).
- **Computed fields filter and sort in SQL.** `lineCount` and `total` are not columns. EF translates them to subqueries, so `total>=100` and `orderBy=total desc` run on the server for the whole table, not only the current page.
- **Enums** parse by name (`status=Paid`). The column holds the name (`HasConversion<string>()`).
- **Day ranges.** `CreatedAt` is a `DateOnly` (`date` column). `UtcDay.Parse` converts the bound `2026-01-31T23:59:59.999Z` into its UTC day, `2026-01-31`, so both ends stay inclusive. `UtcDayTests` checks this.
- **Customers** (`ListCustomers.cs`) uses `new GridifyMapper<CustomerEntity>(autoGenerateMappings: true)` and overrides only `createdAt`, because the customers filter already uses the entity's property names.

`ToPagedResultAsync` (`src/Api/Querying/QueryableExtensions.cs`) is the only place that calls Gridify:

```csharp
var filtered = source.ApplyFiltering(gridifyQuery, mapper);           // WHERE …
var count = await filtered.CountAsync(ct);                              // SELECT COUNT(*) …
var data = await filtered.ApplyOrderingAndPaging(gridifyQuery, mapper)  // ORDER BY … OFFSET … FETCH …
    .Select(select)                                                     // only the response's columns
    .ToListAsync(ct);
```

The slice sets the default order before it (`OrderByDescending(o => o.Id)`, newest first). An `orderBy` in the query replaces it. `pageSize` is clamped to 1–100.

## Worked example

App 1 → Orders. Pick **Status: Paid**, then type `100` in **Order total min**:

1. The status pick navigates to `?status=Paid`. The typed amount commits 350 ms later as `?status=Paid&total={"min":"100"}`, after the page reset.
2. `validateSearch` settles it to `{ status: "Paid", total: { min: 100 } }`. That object is the query key.
3. `toGridifyQuery` → `{ page: 1, pageSize: 5, filter: "status=Paid,total>=100" }`.
4. `GET /api/orders?page=1&pageSize=5&filter=status%3DPaid%2Ctotal%3E%3D100`.
5. The mapper and EF produce roughly:

   ```sql
   SELECT COUNT(*) FROM orders o
   WHERE o.status = N'Paid' AND (SELECT SUM(l.quantity * l.unit_price) FROM order_lines l WHERE l.order_id = o.id) >= 100;
   -- then the page: same WHERE, ORDER BY o.id DESC OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY
   ```

6. `{ data, count }` comes back. The table renders it, and the Requests panel logs `page=1&pageSize=5&filter=status=Paid,total>=100`.

## Adding a filter field

1. **Back:** add an `AddMap("name", entity => …)` to the slice's mapper (Customers: nothing to add if the field is an entity property with the same name). Add an integration test with the exact filter string the front will send (`CustomersTests` and `OrdersTests` show the pattern).
2. **Front:** add one builder call to the entity's `filter.ts`, with `field: "name"`. The schema, URL key, query and control all come from that call. If it is a new kind of field, add its query to `field-queries.ts` and a case to `field-queries.test.ts`.
3. **Sortable column:** add `columnId: "gridifyField"` to `SORT_FIELDS`, and make sure the mapper has that field.

## Known gap

A list route's `validateSearch` and `loader` must load before its page, so they import the domain's `filter.ts`. Its field builders carry their control components, so the filtering layer (Base UI, zod, date-fns) is in the startup bundle. `web/README.md` (Chunks) describes this and the fix: load the controls behind `lazy()` in `fields.tsx`.
