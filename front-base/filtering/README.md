# Front Base — filtering

The most minimal version of [`client-side`](../client-side): one page, a few filter controls, and
the Gridify filter string they produce, sent through React Query to a tiny mock API. It is a sandbox to
iterate on filtering. There is no shell and no data table.

It reuses the filter controls from `client-side` and makes the **URL the only filter state**, so the
route loader can fetch it:

- the filter **is** the validated URL search (`/?q=acme&status=paid&min=10.5&from=…&to=…`), typed
  `OrdersSearch`; there is no separate filter object, no `useState` copy of it, and no effect;
- `FilterBar` gets `search` + `onPatch(raw partial)` + `onReset`, and each patch is a
  `navigate({ search: (prev) => ({ ...prev, ...changes }) })`;
- picks (status, dates, reset) navigate at once; **typed fields** (search, totals) keep a draft while
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

| Piece                | Where                  | What it does                                                                                                              |
| -------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Router context       | `router.tsx`, `__root` | `createRootRouteWithContext<{ queryClient }>`, so loaders reach the one `QueryClient`.                                    |
| `validateSearch`     | `routes/index.tsx`     | `validateOrdersSearch` (`filter.ts`): reads the URL and each navigation's next search leniently into `OrdersSearch`.      |
| `loaderDeps`         | `routes/index.tsx`     | `({ search }) => search`: the loader re-runs whenever the settled filter changes.                                         |
| Loader               | every match of `/`     | `prefetchQuery`, not awaited: the page shows at once with its loading state; `useQuery` joins the in-flight request.      |
| `ordersQueryOptions` | `api/use-orders.ts`    | One `queryOptions` for loader and page, keyed `["orders", search]`, so both use the same cache entry.                     |
| `staleTime: 30_000`  | `ordersQueryOptions`   | Needed: with 0, data the loader just fetched is already stale when the page subscribes, so it would fetch twice.          |

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

**Validation without a schema library.** `validateSearch` accepts a plain function:
`validateOrdersSearch` trims the text, parses amounts, checks the status and date formats, and drops
empty values. The router runs it on the URL **and** on the search every navigation builds, so it is
the one parser: `FilterBar` patches the controls' raw values (`"acme "`, `{ min: "10,5", max: "" }`,
a cleared status as `null`) and the URL gets `q=acme&min=10.5`. Its parameter is typed
`OrdersSearchInput & SearchSchemaInput`; the `SearchSchemaInput` tag tells the router that this
looser type is what `navigate` accepts. Invalid values are dropped, never a route error.
`?status=bogus&min=abc&from=nope` → `/`, and a hand-typed `max=10,5` is normalized to `max=10.5`.

**URL encoding.** By default the router JSON-encodes search values, which quotes number-like strings
(`q=%22123%22`). The search params here are flat, so `router.tsx` sets `parseSearch` /
`stringifySearch` to plain `URLSearchParams`: the URL reads `?q=123&min=10.5`, every value arrives
as a string, and `validateSearch` is the one place that types it.

## Data fetching (mock)

`api/orders-api.ts` fakes `GET /api/orders?filter=…`. It logs each call to the console
(`[mock] #3 GET /api/orders?filter=…`), waits 300 ms, and returns six fixed orders plus an echo of the
filter it received and a request number. **It does not evaluate the filter**, so the rows never
change. The goal is only to check that each filter change triggers a request. `useOrders` adds
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
| Deep link `?q=globex&status=pending&min=5&from&to`, fresh tab | 1     | every control seeded from the URL; the loader fetch is not repeated by the page |
| Invalid `?status=bogus&min=abc&max=10,5&from=nope`            | 1     | invalid keys dropped, `max` normalized → `max=10.5`                             |

The 0-call rows are cache hits within the 30 s `staleTime`. Past it, the same actions refetch.

## Filters

| Control          | UI component       | Search keys  | Gridify output                               |
| ---------------- | ------------------ | ------------ | -------------------------------------------- |
| Search           | `SearchInput`      | `q`          | `(orderNo=*q\|customer.name=*q)`             |
| Dropdown         | `SearchSelect`     | `status`     | `status=paid`                                |
| Number range     | `NumberRangeInput` | `min`, `max` | `total>=10.5,total<=200`                     |
| Calendar (range) | `DateRangePicker`  | `from`, `to` | `createdAt>=2026-01-01,createdAt<2026-02-01` |

The calendar's `to` is inclusive in the UI and becomes an exclusive next-day bound in the query.

## Shared controls

The filter bar is built only from `shared/components/ui/` controls, and a form uses the same ones.
That keeps the look and feel identical; each context provides its own wrapper (`FilterField` here, a
form field with an error message later).

| Control            | Value                   | Notes                               |
| ------------------ | ----------------------- | ----------------------------------- |
| `SearchInput`      | `string`                | `Input` with a leading search icon  |
| `NumberInput`      | `string` (raw, decimal) | `inputMode="decimal"`, tabular-nums |
| `NumberRangeInput` | `{ min, max }` strings  | two `NumberInput`s                  |
| `SearchSelect<T>`  | `T \| null`             | typed by its options, so no casts   |
| `DateRangePicker`  | `{ from, to }`          | inclusive bounds                    |

They share one contract:

- **Controlled** — `value` and `onChange(next)`, where `onChange` receives the value, not an event.
- **One size** — `CONTROL_CLASS` (`h-9 w-full`). The control fills its container, so the wrapper
  sets the width.
- **Label-ready** — they accept the shared `ControlProps` (`id`, `aria-label`, `aria-invalid`,
  `aria-describedby`, `disabled`, `className`), so a form's `<label htmlFor>` and error text can
  point at them; `aria-invalid` turns them red.

Number values stay **raw strings** so half-typed input (`"10,"`) survives a re-render. Parse them
where you use them (here the route's `validateSearch`, in a form its submit/validation).

## Layout

```text
src/
├─ features/orders-filters/
│  ├─ api/
│  │  ├─ orders-api.ts   # mock GET /api/orders?filter=… (logs, echoes, fixed rows)
│  │  └─ use-orders.ts   # ordersQueryOptions (loader + page) + useOrders
│  ├─ filter.ts          # OrdersSearch (the filter), its raw input type, validateSearch, toGridifyFilter
│  ├─ filter-bar.tsx     # dumb: maps the search onto the shared controls, labels them, sets widths
│  └─ filters-page.tsx   # smart page: search from URL, patch = navigate, query, request log
├─ shared/
│  ├─ components/
│  │  ├─ filter-field.tsx  # label above a filter control
│  │  └─ ui/               # button, input, popover + the shared controls above (control.ts = size + ControlProps)
│  ├─ hooks/use-buffered-value.ts  # draft while editing, commit on pause/blur
│  └─ lib/               # gridify.ts (ConditionSpec → filter string), date, format, utils
├─ router.tsx            # QueryClient + router (queryClient in context)
└─ routes/               # __root (router context) + index (validateSearch, loaderDeps, loader)
```

## Stack

Same as `client-side`, minus what filtering does not need: React 19 · TypeScript 7 · Vite 8 ·
Tailwind v4 · shadcn-style components on Base UI (_base-nova_) · TanStack Router (file-based) ·
TanStack Query 5 · `gridify-client` 2 · oxlint · oxfmt.

## Running

```bash
cd front-base/filtering
bun install
bun run dev      # http://localhost:5173
bun run build    # tsr generate && tsc --noEmit && vite build
bun run lint
```
