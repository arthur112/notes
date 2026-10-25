# Front Base — filtering

A filtering sandbox with **two filtered domains — Orders and Customers — built from one reusable,
config-driven filtering layer**. Each domain declares its filter fields once; the layer derives the
route's Zod search schema, the Gridify query and the filter bar from that declaration. The URL is the
**only filter state**, so a route loader can fetch it and Back/Forward, deep links and links need no
code.

- the filter **is** the validated URL search
  (`/customers?q=stark&segment=Enterprise&countries=["United States"]&active=true&creditLimit={"min":10000}&created={"from":"2025-01-01"}`),
  typed `CustomersSearch`; there is no separate filter object, no `useState` copy, no effect;
- a domain's `filter.ts` is one `defineFilter({ fields, sortFields })` call;
- `FilterBar` renders the definition: the search field inline, the other fields behind a **Filters**
  popover with an active-filter count;
- picks (selects, multi-selects, dates, booleans) patch at once; **typed fields** (search, number
  ranges) keep a draft while edited and patch once typing pauses for 350 ms or the field loses focus
  (`useBufferedValue`);
- each list route validates with the definition's schema and its **loader** fetches through the
  shared `QueryClient`; the page's `useQuery` joins the same cache entry;
- the same URL drives a shared TanStack Table v9 `DataTable` (server-side sorting + paging) and the
  shared inspection panels (URL, Gridify query, requests, validated search).

```text
picks ──────────────────────────────┐
typed fields ─▶ draft ─▶ 350 ms/blur ─┴─▶ navigate({ search }) ─▶ URL
                                                                  ├─▶ controls: search
                                                                  ├─▶ loader:   queryClient.query (not awaited)
                                                                  └─▶ page:     useOrders / useCustomers(search)
                                                                                  └─▶ queryFn: mock GET /api/…?…toGridifyQuery(search)
```

## Two domains

```text
/                    → redirect to /orders
/orders              → Orders list (orders filter definition)     + /orders/new, /orders/:orderNo/edit
/customers           → Customers list (customers filter definition)
```

`__root.tsx` adds a small nav shell so both lists are reachable. Everything below the shell is
per-domain: the `defineFilter` call, the query options, the mock API, the columns and a thin smart
page. The bar, table, diagnostics, request log and field controls are shared.

## The filter definition

`features/orders-filters/filter.ts` and `features/customers-filters/filter.ts` are the whole
declaration of their domain's filtering:

```ts
export const customersFilter = defineFilter({
  fields: {
    q: searchField({ fields: ["name", "email"], placeholder: "Name or email…", ariaLabel: "…" }),
    segment: selectField({
      label: "Segment",
      field: "segment",
      source: { options: SEGMENTS },
      schema: z.enum(SEGMENTS),
    }),
    countries: multiSelectField({
      label: "Countries",
      field: "country",
      source: { options: COUNTRIES },
      schema: z.enum(COUNTRIES),
    }),
    active: booleanSelectField({ label: "Status", field: "active" }),
    creditLimit: numberRangeField({ label: "Credit limit (€)", field: "creditLimit" }),
    created: dateRangeField({ label: "Customer since", field: "createdAt" }),
  },
  sortFields: SORT_FIELDS, // table column id → Gridify field
});
```

`defineFilter` derives three things and exposes two types:

| Derived / exposed               | What it is                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `schema`                        | `z.object` with each field's schema plus `page`, `pageSize`, `sort`; `validateSearch` takes it directly (Standard Schema). |
| `toGridifyQuery(search)`        | `page`, `pageSize`, `orderBy` from `sortFields`, then each active field's conditions, ANDed in declaration order.          |
| `entries`                       | `[key, field]` in declaration order: what `FilterBar` renders (inline search, popover fields).                             |
| `pageSizes` / `defaultPageSize` | The footer's sizes and the absent-value default (5).                                                                       |
| `FilterSearch<M>`               | The settled search (parsed numbers, booleans, `Ymd` bounds).                                                               |
| `FilterSearchInput<M>`          | What a patch may hold: a control's **raw** value (`{ min: "10,5" }`) **or** a settled one (`{ min: 10.5 }`).               |

The field builders live in `shared/filtering/fields.tsx`:

| Builder                  | Settled value / control input                        | Gridify condition                                      |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------------------ |
| `searchField`            | `string` / `string`                                  | `(a=*q\|b=*q)` over the listed fields                  |
| `selectField<T, V>`      | `V` / `V \| null` (`V`: the item, or its key)        | `field=V`                                              |
| `multiSelectField<T, V>` | `V[]` / `V[]`                                        | `(field=a\|field=b)`                                   |
| `numberRangeField`       | `{min?:number,max?:number}` / `{min,max}` strings    | `field>=min,field<=max`                                |
| `dateRangeField`         | `{from?:Ymd,to?:Ymd}` / `{from,to}` (`null` = unset) | `field>=from,field<to+1d` (local midnights, as UTC)    |
| `booleanSelectField`     | `boolean` / `boolean \| null`                        | `field=true\|false` (a tri-state Active/Inactive pick) |

Each builder owns its schema, its Gridify condition, its settled→control mapping and its control.
The typed ones wrap `SearchInput` / `NumberRangeInput` in `useBufferedValue`, so only that field
re-renders per keystroke. Both select builders take a `source` of static `options` or a
`useOptions` hook — the orders filter uses `useCustomerOptions`, so the customer picker fetches its
options and `staleTime: Infinity` serves every later open (and the order form) from cache.

Both select builders take items of any type `T` and store a `V` — a string, a number or a boolean —
which their `schema` parses (one value, for the multi-select). Base UI's own props go through
`comboboxProps`: `itemToStringLabel` labels an item, and `itemToStringValue` (default `String`) keys
it. A primitive item is stored as is; with `itemToStringValue`, only the item's key is stored, and the
control finds the loaded item that key belongs to. So an object item keeps the URL short and Gridify
gets the key:

```ts
customer: selectField({
  label: "Customer",
  field: "customer.customerNo",
  source: { useOptions: useCustomerOptions }, // { options: CustomerRef[], isPending, isError }
  schema: z.string(), // the key
  comboboxProps: {
    itemToStringLabel: (customer) => customer.name,
    itemToStringValue: (customer) => customer.customerNo,
  },
}),
// URL: customer=CUS-1002 · Gridify: customer.customerNo=CUS-1002
```

The cost: on a deep link, the picker shows its name once the options have loaded, and an unknown
key (`customer=CUS-9999`) passes the schema, still filters, and shows no item. Every kind of item
has an example in the two filters, to try by hand:

| Item                  | Single select                             | Multi select             |
| --------------------- | ----------------------------------------- | ------------------------ |
| string                | orders `status`, customers `segment`      | customers `countries`    |
| number                | orders `lineCount`                        | customers `paymentTerms` |
| object (query, keyed) | orders `customer`                         | customers `customers`    |
| boolean               | customers `active` (`booleanSelectField`) | —                        |

`lineCount` and `paymentTerms` filter fields the mock data does not have; they are there to show the
number items (the mock never evaluates the filter anyway).

**One parser, leniently.** `lenient(schema)` makes a key `.optional().nullable()`, normalizes `null`
to `undefined`, and `.catch`es invalid input to `undefined`. So `?segment=bogus&active=yes&creditLimit={"min":"abc"}&pageSize=7`
simply drops those keys — never a route error — and an empty control (`{min:"",max:""}`, a cleared
select) means "no constraint". The schema's **input** is what `navigate` accepts, its **output** the
typed search. The number and date ranges validate each bound; at least one bound is required.

**Why the cast in `defineFilter`.** Zod sees the raw input types (`{ min?: unknown }` after
`z.preprocess`, `boolean | null | undefined`), while the controls want domain types
(`NumberRange`, `boolean | null`). The schema is built from the field schemas and cast to
`z.ZodType<FilterSearch<M>, FilterSearchInput<M>>`, so the router and `navigate` see exactly the
declared types. Runtime parsing is unchanged.

## Route ↔ React Query

| Piece                                          | Where                                             | What it does                                                                                           |
| ---------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Router context                                 | `router.tsx`, `__root`                            | `createRootRouteWithContext<{ queryClient }>`, so loaders reach the one `QueryClient`.                 |
| `validateSearch`                               | `routes/orders/index.tsx`, `routes/customers.tsx` | The domain's `filter.schema`: reads the URL and each navigation's next search leniently.               |
| `loaderDeps`                                   | both list routes                                  | `({ search }) => search`: the loader re-runs whenever the settled filter changes.                      |
| Loader                                         | every match of a list route                       | `queryClient.query`, not awaited: the page shows at once with its loading state.                       |
| `ordersQueryOptions` / `customersQueryOptions` | `api/use-*.ts`                                    | One `queryOptions` for loader and page, keyed `["orders", search]` / `["customers", search]`.          |
| `staleTime: 30_000`                            | both query options                                | Needed: with 0, data the loader just fetched is already stale when the page subscribes (double fetch). |
| Awaited edit loader                            | `routes/orders/$orderNo/edit.tsx`                 | `ensure`-style await, unlike the list: the form reads `defaultValues` once at mount.                   |

**Why a loader that doesn't wait.** `autoCodeSplitting` makes each page a lazy chunk. Without the
loader, the request would only start once that chunk has downloaded and rendered. With it, the
request starts as soon as the router matches the URL, in parallel with the chunk download. Not
awaiting it means the router never holds the page back; the page's `useQuery` joins the in-flight
request rather than sending another.

**One copy of the filter, no sync.** The controls read the URL, so Back/Forward and links need no
code. Only typed fields need a debounce, so it lives there: `useBufferedValue` shows a draft while the
field is edited (half-typed `10.` or a trailing space survive) and the URL value otherwise. Patches
use `navigate({ search: (prev) => … })`, so a debounced patch landing later applies to the current
search, not a stale one. Each settled change is a history entry, so **Back undoes a filter**. The one
gap: Back/Forward while a typed field still has focus keeps its draft until the field is blurred.

## URL encoding

The router keeps its default `parseSearch` / `stringifySearch`, which JSON-encodes each value, so the
search holds the shapes filters need:

| Shape  | Examples (decoded)                                                                | Parsed back as                                |
| ------ | --------------------------------------------------------------------------------- | --------------------------------------------- |
| Flat   | `q=acme`, `status=paid`, `customer=CUS-1002`, `active=true`, `lineCount=2`        | `"acme"`, `"paid"`, `"CUS-1002"`, `true`, `2` |
| Array  | `countries=["Germany","Sweden"]`, `paymentTerms=[30,60]`                          | `["Germany","Sweden"]`, `[30, 60]`            |
| Object | `total={"min":10.5,"max":200}`, `created={"from":"2026-01-01","to":"2026-01-31"}` | `{ min: 10.5, max: 200 }`, `{ from, to }`     |
| Sort   | `sort=[{"id":"total","desc":true},{"id":"customer","desc":false}]`                | `SortingState`                                |

The cost is readability: values are percent-encoded JSON, and a number-like string is quoted so it
stays a string (`q: "123"` → `q=%22123%22`). A hand-typed `?q=123` arrives as the number `123`, so
`q`'s schema accepts a number and coerces it back to text. A plain `URLSearchParams` parser reads
every value as one string: it cannot tell `["a","b"]` from `"a,b"` and keeps only the last of
repeated keys, so arrays and objects would need their own encoding.

## Data fetching (mock)

`api/orders-api.ts` and `api/customers-api.ts` fake `GET /api/orders` and `GET /api/customers`. Each
logs its call to the console (`[mock] #3 GET /api/customers?page=1&pageSize=5&orderBy=…&filter=…`),
waits 300 ms, sorts its in-memory store by `orderBy`, and returns one page as Gridify's `Paging<T>`
(`{ count, data }`) plus an echo of the query it received and a request number. **Neither evaluates
the filter**, so a filter never changes the rows (only sorting, paging and the order form do). The
goal is to check that each filter change triggers a request and produces the expected Gridify query.

`shared/filtering/request-log.ts` provides what both mocks and both pages use: `createRequestLog()`
(newest first, capped, with subscribers for `useSyncExternalStore`), `toQueryString(query)` and
`compareBy(orderBy, accessors)`. The page reads its domain's log with
`useSyncExternalStore(subscribeRequestLog, getRequestLog)`; the mock records into it, so the page
needs no effect.

`customers-api.ts` also serves `GET /api/customers/options` — `{ customerNo, name }` refs for the
customer pickers (`customerOptionsQueryOptions`, `staleTime: Infinity`). The order form `select`s
their names (orders reference customers by name); the orders filter's customer select and the
customers filter's customers multi-select share the cache through `useCustomerOptions`.

## Filters

Both definitions use the same control types; only the fields differ.

| Orders control  | Key         | Gridify output                                                   |
| --------------- | ----------- | ---------------------------------------------------------------- |
| Search          | `q`         | `(orderNo=*q\|customer.name=*q)`                                 |
| Status          | `status`    | `status=paid`                                                    |
| Customer        | `customer`  | `customer.customerNo=CUS-1002`                                   |
| Lines           | `lineCount` | `lineCount=2`                                                    |
| Order total (€) | `total`     | `total>=10.5,total<=200`                                         |
| Created between | `created`   | `createdAt>=2025-12-31T23:00:00Z,createdAt<2026-01-31T23:00:00Z` |

| Customers control | Key            | Gridify output                                                   |
| ----------------- | -------------- | ---------------------------------------------------------------- |
| Search            | `q`            | `(name=*q\|email=*q)`                                            |
| Segment           | `segment`      | `segment=Enterprise`                                             |
| Countries         | `countries`    | `(country=Germany\|country=Sweden)`                              |
| Customers         | `customers`    | `(customerNo=CUS-1001\|customerNo=CUS-1002)`                     |
| Payment terms     | `paymentTerms` | `(paymentTermsDays=30\|paymentTermsDays=60)`                     |
| Status            | `active`       | `active=true` / `active=false`                                   |
| Credit limit (€)  | `creditLimit`  | `creditLimit>=10000,creditLimit<=500000`                         |
| Customer since    | `created`      | `createdAt>=2024-12-31T23:00:00Z,createdAt<2025-12-31T23:00:00Z` |

The calendar's `to` is inclusive in the UI and becomes an exclusive next-day bound in the query.
The URL keeps the short `YYYY-MM-DD` bounds. A day is a day in the browser's time zone, and the
query sends the UTC instant it starts at, in ISO 8601 (`shared/lib/date.ts`). In Brussels,
`2026-01-01` starts at `2025-12-31T23:00:00Z` (the examples above) and `2026-07-01` at
`2026-06-30T22:00:00Z`; in New York, `2026-01-01` starts at `2026-01-01T05:00:00Z`. The same URL
therefore means each viewer's own days, which suits timestamps with no place attached (created at,
last login). The backend stores and compares UTC only: a .NET 10 API binds the bound to a UTC
`DateTime` (or a `DateTimeOffset`) with no setup. "Today" (`todayYmd`) and `formatDate` use the
browser's zone too, so the calendar, the filter and the displayed dates agree. Tests pin
`TZ=Europe/Brussels` in `vite.config.ts`. A date that belongs to a place (a shop's sales day) would
instead be a `DateOnly` column, filtered with the bare `YYYY-MM-DD` form.

Checked in headless Chromium. Each settled change produces exactly one request (the loader and the
page share the cache entry); Back/Forward and revisits within the 30 s `staleTime` are served from
cache:

| Action (domain)                                                          | Result                                                                                                                            |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Load `/`                                                                 | redirects to `/orders`, one `page=1&pageSize=5` request                                                                           |
| Type `acme` (orders)                                                     | `?q=acme`                                                                                                                         |
| Status → Paid                                                            | `?q=acme&status=paid`, at once (no debounce on picks)                                                                             |
| Min `10.5`, max `200`                                                    | `?q=acme&status=paid&total={"min":10.5,"max":200}`; `total>=10.5,total<=200`                                                      |
| Back / Forward                                                           | the previous / next filter, controls reseeded from the URL                                                                        |
| Deep link with `q`, `status`, `total`, `created` (fresh tab)             | every control seeded; Gridify has all four conditions                                                                             |
| Invalid `?segment=bogus&active=yes&creditLimit={"min":"abc"}&pageSize=7` | invalid keys dropped, `/customers` defaults                                                                                       |
| Customers: Segment + Countries + Active + credit range                   | `?segment=Enterprise&countries=["United States","Sweden"]&active=true&creditLimit={"min":10000,"max":500000}`; one Gridify string |
| Customers page 2                                                         | “Page 2 of 3 · 12 customers”                                                                                                      |
| Sort header / rows per page                                              | `?sort=[{"id":"creditLimit","desc":true}]`, then `&pageSize=10`; back on page 1                                                   |
| Clear filters (popover)                                                  | drops the popover fields, keeps `q`, sort and page size                                                                           |
| Clear a single select (its X)                                            | drops just that key                                                                                                               |
| Orders New / Edit / Cancel                                               | still routed; Cancel lands on `/orders`                                                                                           |

## Table (TanStack Table v9)

`shared/filtering/data-table.tsx` owns the table for every domain. The entity only supplies columns;
the table stays server-side:

| Piece                                                                  | Why                                                                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `filterTableFeatures`                                                  | v9 registers features explicitly: `rowSortingFeature`, `rowPaginationFeature`, `columnMeta` (`className` per column). No row models. |
| `manualSorting` + `manualPagination`                                   | `data` is already the sorted page; `rowCount: count` gives the page count.                                                           |
| `state: { sorting, pagination }` + `on…Change`                         | Controlled from the URL. The table resolves each updater (`functionalUpdate`) and reports the next value; the page navigates.        |
| Module-scope `columns` (`orders-columns.tsx`, `customers-columns.tsx`) | v9 invalidates its models when these references change; use `createColumnHelper<typeof filterTableFeatures, T>()`.                   |

The URL holds the state, so Back/Forward and deep links cover sorting and paging too:

| Key        | Example (decoded)                                                  | Gridify                             | Absent means       |
| ---------- | ------------------------------------------------------------------ | ----------------------------------- | ------------------ |
| `page`     | `page=2`                                                           | `page=2` (1-based)                  | page 1             |
| `pageSize` | `pageSize=10` (one of `PAGE_SIZES`: 5, 10, 20)                     | `pageSize=10`                       | 5                  |
| `sort`     | `sort=[{"id":"total","desc":true},{"id":"customer","desc":false}]` | `orderBy=total desc, customer.name` | the server's order |

`sort` is the table's `SortingState` as is; a definition's `sortFields` maps each column id to its
Gridify field (`customer` → `customer.name`, the same field the search uses). Click a header to sort
(Shift+click adds a column). A filter or sort change goes back to page 1, and page 1 and the default
page size stay out of the URL, so `/orders` and `/orders?page=1` share one cache entry. Invalid
values (`page=abc`, `pageSize=7`, an unknown column) are dropped like the filter's. The footer's
`itemsLabel` (“orders” / “customers”) is the only copy the table needs from the domain.

## Reusable layer

```text
shared/filtering/
├─ definition.ts        # FieldSpec types, lenient/text/amount, defineFilter, PAGE_SIZES
├─ fields.tsx           # searchField, selectField, multiSelectField, numberRangeField, dateRangeField, booleanSelectField (+ controls)
├─ filter-bar.tsx       # inline search + Filters popover, active count, Clear filters
├─ data-table.tsx       # filterTableFeatures, FilterColumn, PagedQueryResult, DataTable
├─ filter-diagnostics.tsx  # URL, Gridify query, request log, children (rows), validated search
├─ filter-page.tsx      # title / description / action frame
└─ request-log.ts       # createRequestLog, toQueryString, compareBy
```

The UI controls themselves stay in `shared/components/ui/` and are shared with the order form:
`SearchInput`, `NumberInput` / `NumberRangeInput`, `DatePicker` / `DateRangePicker`,
`ComboboxSelect` / `ComboboxMultiSelect`. They share one contract: controlled (`value` +
`onChange(next)`), one size (`CONTROL_CLASS`: `h-9 w-full`), label-ready (`ControlProps`), and raw
string numbers so a half-typed value survives a re-render. The selects (`combobox-select.tsx`) wrap
shadcn's stock `Combobox` (Base UI, `npx shadcn@latest add combobox`) over items of any type — an
input with a clear button for one value, chips for many — and pass `comboboxProps` through to it.

## Order form (TanStack Form)

`/orders/new` and `/orders/:orderNo/edit` (**New order** on the list, or click an order number) render
one `OrderForm`. On save it invalidates the orders queries and returns to `/orders`, which refetches
and shows the change.

| Piece                   | Where                                    | Why                                                                                                                                                     |
| ----------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createFormHook`        | `shared/components/form/use-app-form.ts` | One `useAppForm` per app, with `TextField` / `NumberField` / `SelectField` / `DateField` and `SubmitButton` pre-bound.                                  |
| `FormField`             | `shared/components/form/fields.tsx`      | Label + control + first error, wired through `ControlProps` (`htmlFor`, `aria-invalid`, `aria-describedby`); "Checking…" while an async validator runs. |
| `formOptions`           | `order-form-options.ts`                  | Defaults, validation logic and validators shared by `useAppForm` and `withForm`, which must agree on every validator type.                              |
| `withForm`              | `order-lines.tsx`                        | Splits a section (the lines) out of the form, typed against the parent's `form`.                                                                        |
| Array field             | `order-lines.tsx`                        | `mode="array"` + `pushValue` / `removeValue`; each cell is its own field at `lines[i].…`. The total is a `form.Subscribe` on the lines.                 |
| Zod, no adapter         | `orderFormSchema`                        | TanStack Form takes it as a Standard Schema. Its **input** is the raw form values, its **output** the API payload.                                      |
| `revalidateLogic()`     | `orderFormOptions`                       | Quiet until the first submit, then revalidates on every change, so a fixed field clears its error as you type.                                          |
| Async field validator   | `reference` in `order-form.tsx`          | `onChangeAsync` + `onChangeAsyncDebounceMs: 400`: one server check per typing pause.                                                                    |
| Save as `onSubmitAsync` | `saveOrder` in `order-form-options.ts`   | Runs only once the schema passes. A 422 returns `{ form, fields }`: the message above the buttons, each field error under its field.                    |
| `useBlocker`            | `order-form.tsx`                         | Confirms before leaving with unsaved changes; after a save, `reset(value)` makes the form pristine.                                                     |
| Awaited loader          | `routes/orders/$orderNo/edit.tsx`        | Unlike the list's loader: the form reads `defaultValues` once, at mount, so the order must be there first.                                              |

**Two gotchas.** `onSubmit` / validators receive the schema's _input_ (raw strings), not its output:
`saveOrder` calls `orderFormSchema.parse(value)` for the typed payload. And validators get only
`{ value, formApi, signal }`, while `withForm` requires the same validators as the form, so the save
can't close over a hook (`useMutation`). It calls the API directly and picks create or update from the
`orderNo` carried in the form values.

The mock has one rule only the server knows: **Umbrella is on credit hold**. It also re-checks the
reference, since the client check is only a hint. The customer picker's options now come from
`GET /api/customers/options`; the customers domain's own list uses the paged endpoint.

## Layout

```text
src/
├─ features/
│  ├─ orders-filters/
│  │  ├─ api/
│  │  │  ├─ orders-api.ts     # mock orders store: list (logs, echoes the query), detail, create/update (422), reference check
│  │  │  └─ use-orders.ts     # ordersQueryOptions (loader + page), useOrders, orderQueryOptions
│  │  ├─ filter.ts            # defineFilter: fields, sortFields, OrdersSearch(+Input), schema, toGridifyQuery
│  │  ├─ orders-columns.tsx   # TanStack Table v9 columns (shared features)
│  │  └─ orders-page.tsx      # smart page: URL search, patch = navigate, query, log, table state
│  ├─ customers-filters/
│  │  ├─ api/
│  │  │  ├─ customers-api.ts  # mock customers store + /api/customers/options (order form picker)
│  │  │  └─ use-customers.ts  # customersQueryOptions/useCustomers, customerOptionsQueryOptions/useCustomerOptions
│  │  ├─ filter.ts            # defineFilter: fields, sortFields, CustomersSearch(+Input)
│  │  ├─ customers-columns.tsx
│  │  └─ customers-page.tsx   # same composition as orders, different definition
│  └─ order-form/
│     ├─ order-form-options.ts  # form values, Zod schema (raw → payload), save validator, formOptions
│     ├─ order-form.tsx         # useAppForm: fields, async reference check, blocker, submit
│     ├─ order-lines.tsx        # withForm section: array field + live total
│     └─ order-form-page.tsx    # NewOrderPage / EditOrderPage (route components)
├─ shared/
│  ├─ filtering/          # definition, fields, bar, table, diagnostics, page frame, request log
│  ├─ components/
│  │  ├─ filter-field.tsx # label above a filter control
│  │  ├─ form/            # form-context, fields (FormField + field components, SubmitButton), use-app-form
│  │  └─ ui/              # button, input, popover + the shared controls (control.ts = size + ControlProps)
│  ├─ hooks/use-buffered-value.ts  # draft while editing, commit on pause/blur
│  └─ lib/                # date, format, utils
├─ router.tsx             # QueryClient + router (queryClient in context)
└─ routes/
   ├─ __root.tsx          # nav shell (Orders | Customers)
   ├─ index.tsx           # / → /orders
   ├─ customers.tsx       # /customers (validateSearch, loaderDeps, loader)
   └─ orders/
      ├─ index.tsx        # /orders list
      ├─ new.tsx          # /orders/new
      └─ $orderNo/edit.tsx # /orders/:orderNo/edit (awaited loader)
```

## Stack

React 19 · TypeScript 7 · Vite 8 · Tailwind v4 · shadcn-style components on Base UI (_base-nova_) ·
TanStack Router (file-based) · TanStack Query 5 · TanStack Table 9 · TanStack Form 1 · Zod 4 ·
`gridify-client` 2 · oxlint · oxfmt.

## Running

```bash
cd front-base/filtering
bun install
bun run dev      # http://localhost:5173
bun run build    # tsr generate && tsc --noEmit && vite build
bun run lint
bun run test     # vitest: the Gridify query each field and the whole filter produce
```
