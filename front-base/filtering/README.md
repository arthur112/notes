# Front Base — filtering

The most minimal version of [`client-side`](../client-side): one page, a few filter controls, and
the Gridify filter string they produce, sent through React Query to a tiny mock API. It is a sandbox to
iterate on filtering. There is no shell and no data table.

It uses the **pre-Zustand** filtering approach from `client-side` (before commit `b2a05b4`):

- the page owns **one filter object** in `useState`;
- a dumb `FilterBar` gets `filter` + `onPatch(partial)` + `onReset`;
- the **whole filter object** is debounced (`useDebouncedValue`, 350 ms): controls update instantly,
  the query only rebuilds once input settles;
- `toConditions(debouncedFilter)` maps the object to plain `ConditionSpec[][]`;
- `buildFilter(conditions)` is the only code that touches `gridify-client`;
- `useOrders(gridifyFilter)` uses the filter string as the React Query key, so a new string fetches.

```text
OrdersFilter (useState) ──▶ useDebouncedValue ──▶ toConditions() ──▶ buildFilter() ──▶ useOrders(filter) ──▶ mock GET /api/orders?filter=…
```

## Data fetching (mock)

`api/orders-api.ts` fakes `GET /api/orders?filter=…`. It logs each call to the console
(`[mock] #3 GET /api/orders?filter=…`), waits 300 ms, and returns six fixed orders plus an echo of the
filter it received and a request number. **It does not evaluate the filter**, so the rows never
change. The goal is only to check that each filter change triggers a request.

`api/use-orders.ts` wraps `useQuery`:

- **Query key** `["orders", "list", filter]`: one cache entry per Gridify string.
- **`placeholderData: keepPreviousData`**: the previous rows stay visible (dimmed) while the next
  request runs.
- **Default `staleTime: 0`**: returning to an earlier filter shows its cached rows at once and still
  refetches.
- **`refetchOnWindowFocus: false`** (set on the `QueryClient`): the only requests come from filter
  changes.

The page shows a **Requests** log, with one line per response: request number, time, and the filter
the mock received. The same information is in the console.

Checked in headless Chromium: initial load gave 1 call. Typing `acme` (4 keystrokes) gave 1 call,
because the debounce collapses them. Picking a status, typing a min total, picking a date range and
clicking Clear all each gave 1 call.

## Filters

| Control          | UI component       | Filter field              | Gridify output                               |
| ---------------- | ------------------ | ------------------------- | -------------------------------------------- |
| Search           | `SearchInput`      | `query`                   | `(orderNo=*q\|customer.name=*q)`             |
| Dropdown         | `SearchSelect`     | `status`                  | `status=paid`                                |
| Number range     | `NumberRangeInput` | `total: { min, max }`     | `total>=10.5,total<=200`                     |
| Calendar (range) | `DateRangePicker`  | `createdAt: { from, to }` | `createdAt>=2026-01-01,createdAt<2026-02-01` |

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
| `DatePicker`       | `Ymd \| null`           | UTC `YYYY-MM-DD`                    |
| `DateRangePicker`  | `{ from, to }`          | inclusive bounds                    |

They share one contract:

- **Controlled** — `value` and `onChange(next)`, where `onChange` receives the value, not an event.
- **One size** — `CONTROL_CLASS` (`h-9 w-full`). The control fills its container, so the wrapper
  sets the width.
- **Label-ready** — they accept `id`, `aria-invalid`, `aria-describedby` and `disabled`, so a form's
  `<label htmlFor>` and error text can point at them; `aria-invalid` turns them red.

Number values stay **raw strings** so half-typed input (`"10,"`) survives a re-render. Parse them
where you use them (`parseAmount` in `filter.ts`, or a zod coercion in a form).

## Layout

```text
src/
├─ features/orders-filters/
│  ├─ api/
│  │  ├─ orders-api.ts   # mock GET /api/orders?filter=… (logs, echoes, fixed rows)
│  │  └─ use-orders.ts   # query keys + useOrders(filter)
│  ├─ filter.ts          # the filter object type, defaults, parseAmount, toConditions
│  ├─ filter-bar.tsx     # dumb: labels the shared controls and sets their widths
│  └─ filters-page.tsx   # smart page: state + debounce + string + query + request log
├─ shared/
│  ├─ components/
│  │  ├─ filter-field.tsx  # label above a filter control
│  │  └─ ui/               # button, input, popover + the shared controls above (control.ts = size)
│  ├─ hooks/use-debounce.ts
│  └─ lib/               # gridify.ts (ConditionSpec → filter string), date, format, utils
└─ routes/               # TanStack Router file-based: __root + index
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
