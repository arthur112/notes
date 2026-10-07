# Front Base — filtering

The most minimal version of [`client-side`](../client-side): one page, a few filter controls, and
the Gridify filter string they produce. It is a sandbox to iterate on filtering. There is no shell, no
table, no mock API and no data fetching.

It uses the **pre-Zustand** filtering approach from `client-side` (before commit `b2a05b4`):

- the page owns **one filter object** in `useState`;
- a dumb `FilterBar` gets `filter` + `onPatch(partial)` + `onReset`;
- only the text query is debounced (`useDebouncedValue`, 350 ms);
- `toConditions(filter, debouncedQuery)` maps the object to plain `ConditionSpec[][]`;
- `buildFilter(conditions)` is the only code that touches `gridify-client`.

```text
OrdersFilter (useState) ──▶ toConditions() ──▶ ConditionSpec[][] ──▶ buildFilter() ──▶ "status=paid,total>=10.5,…"
```

## Filters

| Control            | Component         | Filter field              | Gridify output                               |
| ------------------ | ----------------- | ------------------------- | -------------------------------------------- |
| Search (debounced) | `Input`           | `query`                   | `(orderNo=*q\|customer.name=*q)`             |
| Dropdown           | `SearchSelect`    | `status`                  | `status=paid`                                |
| Number inputs      | `Input` (decimal) | `minTotal` / `maxTotal`   | `total>=10.5,total<=200`                     |
| Calendar (range)   | `DateRangePicker` | `createdAt: { from, to }` | `createdAt>=2026-01-01,createdAt<2026-02-01` |

The calendar's `to` is inclusive in the UI and becomes an exclusive next-day bound in the query.

## Layout

```text
src/
├─ features/orders-filters/
│  ├─ filter.ts          # the filter object type, defaults, parseAmount, toConditions
│  ├─ filter-bar.tsx     # dumb, controlled filter controls
│  └─ filters-page.tsx   # smart page: state + debounce + generated string
├─ shared/
│  ├─ components/        # filter-field + ui/ (button, input, popover, search-select, date-picker)
│  ├─ hooks/use-debounce.ts
│  └─ lib/               # gridify.ts (ConditionSpec → filter string), date, format, utils
└─ routes/               # TanStack Router file-based: __root + index
```

## Stack

Same as `client-side`, minus what filtering does not need: React 19 · TypeScript 7 · Vite 8 ·
Tailwind v4 · shadcn-style components on Base UI (_base-nova_) · TanStack Router (file-based) ·
`gridify-client` 2 · oxlint · oxfmt.

## Running

```bash
cd front-base/filtering
bun install
bun run dev      # http://localhost:5173
bun run build    # tsr generate && tsc --noEmit && vite build
bun run lint
```
