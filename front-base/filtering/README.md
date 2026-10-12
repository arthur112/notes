# Front Base — filtering

The most minimal version of [`client-side`](../client-side): one page, a few filter controls, and
the Gridify filter string they produce, sent through React Query to a tiny mock API. It is a sandbox to
iterate on filtering. There is no shell and no data table. A **create / edit order form** built
with TanStack Form shares the same controls (see [Order form](#order-form-tanstack-form)).

It reuses the filter controls from `client-side` and makes the **URL the only filter state**, so the
route loader can fetch it:

- the filter **is** the validated URL search (`/?q=acme&status=paid&customers=[…]&min=10.5&created={…}`), typed
  `OrdersSearch`; there is no separate filter object, no `useState` copy of it, and no effect;
- `FilterBar` gets `search` + `onPatch(raw partial)` + `onReset`, and each patch is a
  `navigate({ search: (prev) => ({ ...prev, ...changes }) })`;
- picks (status, customers, dates, reset) navigate at once; **typed fields** (search, totals) keep a draft while
  edited and patch once typing pauses for 350 ms or the field loses focus (`useBufferedValue`);
- the route validates the search with a plain function, and its **loader** fetches through the shared `QueryClient`;
- the page's `useOrders(search)` reads the same query. The validated search is the query key;
  `toGridifyFilter(search)` (through `buildFilter`, the only code that touches `gridify-client`) turns
  it into the Gridify string only inside the `queryFn`.

```text
picks ──────────────────────────────┐
typed fields ─▶ draft ─▶ 350 ms/blur ─┴─▶ navigate({ search }) ─▶ URL
                                                                  ├─▶ controls: search
                                                                  ├─▶ loader:   queryClient.prefetchQuery (not awaited)
                                                                  └─▶ page:     useOrders(search)
                                                                                  └─▶ queryFn: mock GET /api/orders?filter=toGridifyFilter(search)
```

## Route ↔ React Query

| Piece                | Where                  | What it does                                                                                                            |
| -------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Router context       | `router.tsx`, `__root` | `createRootRouteWithContext<{ queryClient }>`, so loaders reach the one `QueryClient`.                                  |
| `validateSearch`     | `routes/index.tsx`     | `ordersSearchSchema` (`filter.ts`, Zod): reads the URL and each navigation's next search leniently into `OrdersSearch`. |
| `loaderDeps`         | `routes/index.tsx`     | `({ search }) => search`: the loader re-runs whenever the settled filter changes.                                       |
| Loader               | every match of `/`     | `prefetchQuery`, not awaited: the page shows at once with its loading state; `useQuery` joins the in-flight request.    |
| `ordersQueryOptions` | `api/use-orders.ts`    | One `queryOptions` for loader and page, keyed `["orders", search]`, so both use the same cache entry.                   |
| `staleTime: 30_000`  | `ordersQueryOptions`   | Needed: with 0, data the loader just fetched is already stale when the page subscribes, so it would fetch twice.        |

**Why a loader that doesn't wait.** `autoCodeSplitting` makes the page a lazy chunk. Without the
loader, the request would only start once that chunk has downloaded and rendered. With it, the request
starts as soon as the router matches the URL, in parallel with the chunk download. Not awaiting it
means the router never holds the page back: the filter bar is usable at once, and the table shows its
loading state until the rows arrive.

**One copy of the filter, no sync.** The controls read the URL, so Back/Forward and links need no
code. Only typed fields need a debounce, so it lives there: `useBufferedValue` shows a draft while the
field is edited (half-typed `10.` or a trailing space survive) and the URL value otherwise, so the
field shows the normalized value (`10`, trimmed) once you leave it. Patches use
`navigate({ search: (prev) => … })`, so a debounced patch landing later applies to the current
search, not to a stale one. The one gap: Back/Forward while a typed field still has focus keeps
its draft until the field is blurred.

Each settled change is a history entry, so **Back undoes a filter**.

**Validation with Zod, leniently.** `validateSearch` takes `ordersSearchSchema` (`filter.ts`)
directly, as a Standard Schema (no adapter), like the order form does. It trims the text, parses
amounts, checks the status and date formats, and drops empty values (an empty `customers` pick, a
`created` range with no bound). The router runs it on the URL
**and** on the search every navigation builds, so it is the one parser: `FilterBar` patches the
controls' raw values (`"acme "`, `{ min: "10,5", max: "" }`, a cleared pick as `undefined`) and the
URL gets `q=acme&min=10.5`. The schema's input type (`OrdersSearchInput`) is what `navigate` accepts,
its output (`OrdersSearch`) the typed search. Each key goes through `lenient()`: an invalid value is
caught as `undefined`, never a route error. `?status=bogus&min=abc&customers="Hooli"` → `/`, and a
hand-typed `max=10,5` is normalized to `max=10.5`.

**URL encoding.** The router keeps its default `parseSearch` / `stringifySearch`, which JSON-encode
each value, so the search holds the three shapes a filter needs:

| Shape  | Key         | URL (decoded)                                     | Parsed back as                             |
| ------ | ----------- | ------------------------------------------------- | ------------------------------------------ |
| Flat   | `status`    | `status=paid`, `min=10.5`                         | `"paid"`, `10.5` (a number)                |
| Array  | `customers` | `customers=["Acme Corp","Globex"]`                | `["Acme Corp", "Globex"]`                  |
| Object | `created`   | `created={"from":"2026-01-01","to":"2026-01-31"}` | `{ from: "2026-01-01", to: "2026-01-31" }` |

The cost is readability: values are percent-encoded JSON, and a number-like string is quoted so it
stays a string (`q: "123"` → `q=%22123%22`). A hand-typed `?q=123` arrives as the number `123`, so
`q` accepts a number and turns it back into text. A plain `URLSearchParams` parser reads every
value as one string: it cannot tell `["a","b"]` from `"a,b"` and keeps only the last of repeated
keys, so arrays and objects would need their own encoding.

## Data fetching (mock)

`api/orders-api.ts` fakes `GET /api/orders?filter=…`. It logs each call to the console
(`[mock] #3 GET /api/orders?filter=…`), waits 300 ms, and returns every order in its in-memory store (six seeded) plus an echo
of the filter it received and a request number. **It does not evaluate the filter**, so the rows only
change when the order form saves. The goal is only to check that each filter change triggers a request. `useOrders` adds
`placeholderData: keepPreviousData`, so the previous rows stay visible (dimmed) while the next request
runs. `refetchOnWindowFocus: false` on the `QueryClient` means the only requests come from filter
changes.

The page shows the current **URL**, the **Gridify filter**, and a **Requests** log, with one line per
response: request number, time, and the filter the mock received. The mock keeps that log itself and
the page reads it with `useSyncExternalStore`, so it needs no effect.

Checked in headless Chromium:

| Action                                                        | Calls | URL / controls afterwards                                                       |
| ------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------- |
| Load `/`                                                      | 1     | `/`                                                                             |
| Type `acme` (4 keystrokes)                                    | 1     | `/?q=acme`                                                                      |
| Status → Paid                                                 | 1     | `/?q=acme&status=paid`, at once (no debounce on picks)                          |
| Min total `10.5`                                              | 1     | `/?q=acme&status=paid&min=10.5`                                                 |
| Back                                                          | 0     | `/?q=acme&status=paid`; min input cleared (cached)                              |
| Forward                                                       | 0     | min input back to `10.5` (cached)                                               |
| Clear all                                                     | 0     | `/` (cached from the first load)                                                |
| Deep link `?q=globex&status=pending&min=5&created`, fresh tab | 1     | every control seeded from the URL; the loader fetch is not repeated by the page |
| Invalid `?status=bogus&min=abc&max=10,5&created={}`           | 1     | invalid keys dropped, `max` normalized → `max=10.5`                             |

The 0-call rows are cache hits within the 30 s `staleTime`. Past it, the same actions refetch.

## Filters

| Control          | UI component        | Search keys  | Gridify output                                    |
| ---------------- | ------------------- | ------------ | ------------------------------------------------- |
| Search           | `SearchInput`       | `q`          | `(orderNo=*q\|customer.name=*q)`                  |
| Dropdown         | `SearchSelect`      | `status`     | `status=paid`                                     |
| Multi-select     | `SearchMultiSelect` | `customers`  | `(customer.name=Acme Corp\|customer.name=Globex)` |
| Number range     | `NumberRangeInput`  | `min`, `max` | `total>=10.5,total<=200`                          |
| Calendar (range) | `DateRangePicker`   | `created`    | `createdAt>=2026-01-01,createdAt<2026-02-01`      |

The calendar's `to` is inclusive in the UI and becomes an exclusive next-day bound in the query.

## Shared controls

The filter bar is built only from `shared/components/ui/` controls, and a form uses the same ones.
That keeps the look and feel identical; each context provides its own wrapper (`FilterField` in the
bar, `FormField` with its error message in the form).

| Control                | Value                   | Notes                               |
| ---------------------- | ----------------------- | ----------------------------------- |
| `SearchInput`          | `string`                | `Input` with a leading search icon  |
| `NumberInput`          | `string` (raw, decimal) | `inputMode="decimal"`, tabular-nums |
| `NumberRangeInput`     | `{ min, max }` strings  | two `NumberInput`s                  |
| `SearchSelect<T>`      | `T \| null`             | typed by its options, so no casts   |
| `SearchMultiSelect<T>` | `T[]`                   | a pick toggles; the list stays open |
| `DateRangePicker`      | `{ from, to }`          | inclusive bounds                    |
| `DatePicker`           | `Ymd \| null`           | single day, same calendar           |

They share one contract:

- **Controlled** — `value` and `onChange(next)`, where `onChange` receives the value, not an event.
- **One size** — `CONTROL_CLASS` (`h-9 w-full`). The control fills its container, so the wrapper
  sets the width.
- **Label-ready** — they accept the shared `ControlProps` (`id`, `aria-label`, `aria-invalid`,
  `aria-describedby`, `disabled`, `className`), so a form's `<label htmlFor>` and error text can
  point at them; `aria-invalid` turns them red.

Number values stay **raw strings** so half-typed input (`"10,"`) survives a re-render. Parse them
where you use them (here in the Zod schemas of the route's `validateSearch` and of the form).

## Order form (TanStack Form)

`/orders/new` and `/orders/$orderNo/edit` (**New order** in the header, or click an order number) render
one `OrderForm`. On save, the form returns to the list, which refetches and shows the change.

| Piece                   | Where                                    | Why                                                                                                                                                                                                                           |
| ----------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createFormHook`        | `shared/components/form/use-app-form.ts` | One `useAppForm` per app, with `TextField` / `NumberField` / `SelectField` / `DateField` and `SubmitButton` pre-bound. A form writes `<form.AppField name="dueDate">{(f) => <f.DateField label="Due date" />}`, never markup. |
| `FormField`             | `shared/components/form/fields.tsx`      | Label + control + first error, wired through `ControlProps` (`htmlFor`, `aria-invalid`, `aria-describedby`); "Checking…" while an async validator runs.                                                                       |
| `formOptions`           | `order-form-options.ts`                  | Defaults, validation logic and validators shared by `useAppForm` and `withForm`, which must agree on every validator type.                                                                                                    |
| `withForm`              | `order-lines.tsx`                        | Splits a section (the lines) out of the form, typed against the parent's `form`.                                                                                                                                              |
| Array field             | `order-lines.tsx`                        | `mode="array"` + `pushValue` / `removeValue`; each cell is its own field at `lines[i].…`. The total is a `form.Subscribe` on the lines, so typing re-renders the total only.                                                  |
| Zod, no adapter         | `orderFormSchema`                        | TanStack Form takes it as a Standard Schema. Its **input** is the raw form values (`"10,5"`, `null`), its **output** the API payload. Each issue lands on the field at its path (`lines[0].quantity`).                        |
| `revalidateLogic()`     | `orderFormOptions`                       | `validators.onDynamic`: quiet until the first submit, then revalidates on every change, so a fixed field clears its error as you type. No `isTouched` gating in the fields.                                                   |
| Async field validator   | `reference` in `order-form.tsx`          | `onChangeAsync` + `onChangeAsyncDebounceMs: 400`: one server check per typing pause.                                                                                                                                          |
| Save as `onSubmitAsync` | `saveOrder` in `order-form-options.ts`   | Runs only once the schema passes. A 422 returns `{ form, fields }`: the message shows above the buttons, each field error under its field, and each clears when its field changes. `onSubmit` then only invalidates + leaves. |
| `useBlocker`            | `order-form.tsx`                         | Confirms before leaving with unsaved changes (`!form.state.isDefaultValue`, read at navigation time, not subscribed). After a save, `formApi.reset(value)` makes the form pristine so it can leave.                           |
| Awaited loader          | `routes/orders.$orderNo.edit.tsx`        | `ensureQueryData`, **awaited**, unlike the list's loader: the form reads `defaultValues` once, at mount, so the order must be there first. The page keys the form by `orderNo`.                                               |

**Two gotchas.** `onSubmit` / validators receive the schema's _input_ (raw strings), not its output:
`saveOrder` calls `orderFormSchema.parse(value)` for the typed payload. And validators get only
`{ value, formApi, signal }`, while `withForm` requires the same validators as the form, so the save
can't close over a hook (`useMutation`). It calls the API directly and picks create or update from the
`orderNo` carried in the form values. The component's `onSubmit` invalidates the queries.

The mock has one rule only the server knows: **Umbrella is on credit hold**. It also re-checks the
reference, since the client check is only a hint.

Checked in headless Chromium:

| Action                                         | Result                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| Open `/orders/new`                             | no errors shown                                                                      |
| Submit empty                                   | Pick a customer · Pick a due date · Required (product) · Required (unit price)       |
| Type a product                                 | its error clears at once; the others stay                                            |
| Qty `3`, unit price `10,5`                     | Total 31.50 €                                                                        |
| Reference `PO-1001`                            | "Checking…" through debounce + request, then "Already used on another order"; 1 call |
| Customer Umbrella, submit                      | "Umbrella is on credit hold." under customer + "The server rejected the order."      |
| Customer → Globex                              | both errors cleared; submit creates `ORD-100107`, list refetches and shows it        |
| Click `ORD-100107`                             | edit form seeded (`Widget`, `3`, `10.5`, `PO-2042`, Globex)                          |
| Cancel on a pristine form                      | leaves, no prompt                                                                    |
| Change qty, Cancel                             | "Discard unsaved changes?"; dismiss stays on the form                                |
| Add a line, Save changes                       | no prompt; list shows the new total (44.00)                                          |
| Remove the only line, submit                   | "Add at least one line"                                                              |
| Deep link `/orders/ORD-100101/edit`, fresh tab | seeded from the awaited loader; saving keeps its own `PO-1001` (not "taken")         |

## Layout

```text
src/
├─ features/
│  ├─ orders-filters/
│  │  ├─ api/
│  │  │  ├─ orders-api.ts   # mock orders store: list (logs, echoes the filter), detail, create/update (422), reference check
│  │  │  └─ use-orders.ts   # ordersQueryOptions (loader + page), useOrders, orderQueryOptions (edit loader + page)
│  │  ├─ filter.ts          # ordersSearchSchema (validateSearch), OrdersSearch + its raw input type, toGridifyFilter
│  │  ├─ filter-bar.tsx     # dumb: maps the search onto the shared controls, labels them, sets widths
│  │  └─ filters-page.tsx   # smart page: search from URL, patch = navigate, query, request log
│  └─ order-form/
│     ├─ order-form-options.ts  # form values, Zod schema (raw → payload), save validator, formOptions
│     ├─ order-form.tsx         # useAppForm: fields, async reference check, blocker, submit
│     ├─ order-lines.tsx        # withForm section: array field + live total
│     └─ order-form-page.tsx    # NewOrderPage / EditOrderPage (route components)
├─ shared/
│  ├─ components/
│  │  ├─ filter-field.tsx  # label above a filter control
│  │  ├─ form/             # form-context, fields (FormField + field components, SubmitButton), use-app-form
│  │  └─ ui/               # button, input, popover + the shared controls above (control.ts = size + ControlProps)
│  ├─ hooks/use-buffered-value.ts  # draft while editing, commit on pause/blur
│  └─ lib/               # gridify.ts (ConditionSpec → filter string), date, format, utils
├─ router.tsx            # QueryClient + router (queryClient in context)
└─ routes/               # __root (router context), index (validateSearch, loaderDeps, loader),
                         # orders.new, orders.$orderNo.edit (awaited loader)
```

## Stack

Same as `client-side`, minus what filtering does not need: React 19 · TypeScript 7 · Vite 8 ·
Tailwind v4 · shadcn-style components on Base UI (_base-nova_) · TanStack Router (file-based) ·
TanStack Query 5 · TanStack Form 1 · Zod 4 · `gridify-client` 2 · oxlint · oxfmt.

## Running

```bash
cd front-base/filtering
bun install
bun run dev      # http://localhost:5173
bun run build    # tsr generate && tsc --noEmit && vite build
bun run lint
```
