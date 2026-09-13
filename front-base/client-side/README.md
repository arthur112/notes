# Front Base — client-side

An **opinionated, client-side-only React base** that answers: _"what should a dashboard app
look like when the same business domain is rendered by several apps with different
specificities?"_ It merges the lazy multi-app shell idea from
[`Federation/lazy`](../Federation/lazy) (one Vite build, one lazy chunk per app) with the
smart/dumb + dense-CRUD guidance from [`UxGuide`](../UxGuide), and adds a shared domain layer
fed by a Gridify-aware **mock API**.

The demonstration business is **orders**. Two apps display the _same_ order data table with
radically different UX, and a third app is a component gallery:

| App                  | Route                  | Its specificity                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Orders · Ops**     | `/apps/orders-ops`     | Dense order desk: a persistent **search + status pills** row with **channel / created-period / amount** behind one labelled `Filters (n)` popover, all executed **server-side** via Gridify query strings. A scope line states the result count, rows are selectable (**bulk mark shipped/delivered, export CSV**), plus a column chooser, density toggle, page-size + jump pagination, row action menu, a deep-linkable **order detail page** (tabbed record: Details / Items / Activity + status changes), and order creation through a TanStack Form sheet. |
| **Orders · Finance** | `/apps/orders-finance` | Lean, read-only: **month + the same status pills**, aggregate cards (count / net / VAT / total), fiscal columns (Net/VAT hidden by default so **Total always fits**), and a **collapsible** "live activity" rail fed by the shell event bus (watch the Ops app from here).                                                                                                                                                                                                                                                                                     |
| **Components**       | `/apps/showcase`       | Living gallery of `shared/components/ui` + shared components: primitives, pickers/selects, TanStack Form binding, DataTable + async states.                                                                                                                                                                                                                                                                                                                                                                                                                    |

Both order apps talk to the same `GET /api/orders?...` contract, share schemas, query keys and
hooks — and share **zero** UX components. That is the point of the layout.

### The shared table UX contract

Both apps render their own columns and filter subset, but obey one table contract
(`shared/components/data-table.tsx` + `shared/components/table-tools.tsx`):

| Piece                         | Rule                                                                                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope line**                | The result count lives in the toolbar (`role="status"`, polite) — never only in the footer.                                                                           |
| **Visible labels**            | Filter controls are labelled above the control (`FilterField`): a placeholder is not a label.                                                                         |
| **One hidden-filter surface** | Low-frequency filters live behind one `Filters (n)` popover. Chips exist **only** for filters with no visible control — search and status pills never produce a chip. |
| **One clear action**          | Exactly one canonical **Clear all filters**, clearing filters only — never sort or page size.                                                                         |
| **Number alignment**          | Numeric columns declare `meta.align: "right"`; the renderer aligns the `<th>` and `<td>`, so money lines up regardless of cell content.                               |
| **Density**                   | Comfortable vs. compact; compact also drops secondary identity lines (`[data-secondary]`) so row height really halves.                                                |
| **Non-blocking loading**      | Refetch keeps rows mounted, dims them and sets `aria-busy`; header and pagination never unmount.                                                                      |
| **Two empty states**          | “No orders yet” (0 filters) vs. “No orders match these filters” + Clear all, rendered _inside_ the table body so toolbar/header/count survive.                        |
| **Deterministic paging**      | Every `orderBy` ends with the unique `id` tiebreaker.                                                                                                                 |
| **Accessible sort**           | `aria-sort` is set on the sorted `<th>` only (moved, never `"none"`), and the header button keeps the column name as its accessible name.                             |

### The record page, tabs & breadcrumb

A row click **navigates to the order's own route** (`/apps/orders-ops/$orderNo`) instead of opening
a drawer, so a record is deep-linkable and _Back_ is a real navigation.

The record's workflows are split into **tabs** (UxGuide §3 — tabs are for mutually exclusive
workflows, not for shuffling fields between them):

| Tab          | Contents                                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Details**  | `Customer`, `Fulfilment`, and `Metadata` (last and **muted**) as 3–9-field cards in a 1 / 2 / 3-column responsive grid (`DetailGrid`). |
| **Items**    | The line-item table and totals, full page width; the tab label carries the item count.                                                 |
| **Activity** | The audit timeline — lifecycle timestamps merged with the session's shell events for this order (`buildOrderActivity`), newest first.  |

Above the tabs a **key-facts strip** (order no, status, customer, total, due) never unmounts, so the
fields 80% of visits need stay one glance away whichever tab is open. The active tab is mirrored
into `?tab=…` (with `history.replace`) — shareable, while _Back_ still leaves the page for the list.
One primary action lives in the header (**Change status**), with the destructive `Cancelled`
transition inside its menu.

The shared dumb pieces are `DetailField`, `DetailGrid`, `DetailSection`, `DetailTabs` and the Base UI
`Tabs` primitive (`shared/components/`); the domain panels are `OrderKeyFacts` / `OrderDetail` /
`OrderItemsPanel` / `OrderActivity` (`features/order-detail/ui/`), composed by the smart
`OrderDetailPage`.

The shell breadcrumb (`shell/Breadcrumbs.tsx`) is derived from the pathname plus route metadata, so
it reads `Apps › Orders · Ops › ORD-100123`: the app crumb is a **link back to the list** and the
record segment is the current, unlinked crumb. The list still keeps its filters in component state
today (Phase 5.2 of `ORDERS-TABLE-PLAN.md` tracks moving them to the URL), so going back re-renders
the desk's default view.

The platform **dashboard** (`/`) is the shell's landing page: sales metrics grouped into four
semantic tiles, each a headline plus its supporting metrics, all compared with the same period a
year earlier —

| Tile           | Headline + rows                                                              | Headline YoY progress   |
| -------------- | ---------------------------------------------------------------------------- | ----------------------- |
| **Revenue**    | net sales · VAT · total billed · avg. order value                            | meter + € change        |
| **Volume**     | orders · units sold · units / order · avg. unit price                        | meter + unit change     |
| **Customers**  | active customers · orders / customer · revenue / customer · units / customer | meter + customer change |
| **Fulfilment** | fulfilment rate · delivered · shipped · open · cancelled                     | meter + pts change      |

Each tile's headline carries a year-over-year meter: **one** bar for this year, scaled against the
larger of the two periods, with last year drawn as a tick on that same scale — plus the change
stated in the metric's own unit (`+€460K`, so a percentage is never the only number). Every row
below keeps its own compact YoY delta. There are no charts: a bar and a marker, not a series.

There is no date picker; the scope is always year-to-date, so the only control is the sidebar
header's top-left **app switcher**, which lists the dashboard and every micro-app (and is
derived from the same route metadata as the sidebar).

## Stack

React 19.2 · TypeScript 7 · Vite 8 · Tailwind v4 · shadcn-style components on **Base UI**
(the _base-nova_ registry flavour, same as `Federation/lazy`) · **TanStack** Router
(file-based), Query, Form, Table **v9** · Zod v4 · `gridify-client` 2 · sonner · oxlint · oxfmt.

## Running

```bash
cd front-base/client-side
bun install
bun run dev      # http://localhost:5173
```

```bash
bun run build    # tsr generate && tsc --noEmit && vite build
bun run lint     # oxlint
bun run fmt      # oxfmt (formats in place)
```

Open the devtools console: every query logs its Gridify round-trip
(`[mock] GET /api/orders?filter=(orderNo=*x|customer.name=*x),status=pending…`).

## Folder layout

```text
client-side/
├─ package.json · vite.config.ts · tsconfig.json · components.json · .oxfmtrc.json · .oxlintrc.json · .gitignore
├─ index.html
└─ src/
   ├─ apps/                       # one folder per lazy-loaded app
   │  ├─ orders-ops/              #    └─ features/<domain>/  DDD-ish grouping
   │  │  └─ features/orders/          ├─ types/      zod schemas + pure filter→Gridify mapping
   │  │      │                        ├─ ui/         dumb, app-specific components
   │  │      │                        ├─ components/ smart glue
   │  │      │                        └─ pages/      route components
   │  │      ├─ features/order-create/   # its own api/ (customers hook lives feature-locally)
   │  │      └─ features/order-detail/   # panels (KeyFacts/Details/Items/Activity) + smart page
   │  ├─ orders-finance/features/orders/
   │  └─ showcase/features/component-gallery/
   ├─ shared/
   │  ├─ components/              # shared composites (DataTable, table-tools, KpiGroupCard,
   │  │                           #   DetailField/DetailGrid/DetailSection/DetailTabs)
   │  │  ├─ filters/             # FilterField, FilterPopover, ActiveFilters
   │  │  └─ ui/                   # base components (shadcn, Base UI) + dumb pickers:
   │  │                           #   button, card, …, table, checkbox, combobox, input-group,
   │  │                           #   multi-select (chips combobox), search-select,
   │  │                           #   year/month/date/date-range picker, pagination-bar,
   │  │                           #   data-states (skeleton/table-empty/empty/error), page-header
   │  ├─ domain/
   │  │  ├─ orders/               # THE shared kernel: types+zod, query keys, endpoints, hooks,
   │  │  │                        #   presentational order cells (status badge, status pills, currency…)
   │  │  │                        #   and the Gridify query builder (apps stay gridify-agnostic)
   │  │  └─ customers/types/      # tiny embedded aggregate used by the create form
   │  ├─ hooks/                   # use-debounce, use-mobile
   │  └─ lib/
   │     ├─ api-client.ts         # transport: mock today, real fetch branch ready
   │     ├─ date.ts · format.ts · utils.ts (cn)
   │     └─ mock/                 # the fake "server"
   │        ├─ gridify.ts         # parser/evaluator of the Gridify query strings
   │        ├─ db.ts              # deterministic seed (1 200 orders, 72 customers)
   │        └─ server.ts          # route handlers (/api/orders, /aggregate, /customers…)
   ├─ routes/                     # TanStack Router file-based; staticData.nav drives sidebar+breadcrumb;
   │                              #   orders-ops nests .index (list) + $orderNo (record)
   ├─ shell/                      # AppFrame, Breadcrumbs, sidebar, app switcher + KPI dashboard, event bus, nav
   └─ assets/
```

### Rules of the layout

- **Apps never know about Gridify.** Each app's feature `types/` maps its filter state to plain
  `ConditionSpec[][]`; `shared/domain/orders` turns those into Gridify query strings with
  `gridify-client` and exposes them through typed hooks (`useOrdersPage`, `useOrderTotals`,
  mutations).
- **Redundancy is allowed where it is UX.** Ops and Finance both define their own filters,
  columns, toolbars and pages — duplicated on purpose. The _domain_ (schemas, query keys, api
  functions) is not duplicated; it lives once in `shared/domain/orders`.
- **Dumb components are controlled.** Pickers, toolbars and tables receive value + onChange;
  state and data fetching stay in the pages/smart components. Everything dumb can be extracted
  to a component library later (see UxGuide).
- **Table presentation is declarative.** Alignment, columns-menu labels and lock rules live on the
  column definition's typed `meta` (`DataColumnMeta`), not in bespoke cell classes — the shared
  renderer applies them so both apps get the same grid behaviour.
- **Records are routes, not overlays.** A row opens `/apps/orders-ops/$orderNo`; the shell
  breadcrumb is the way back. Sheets are reserved for creating and editing, where a modal's
  focus trap and dismissal help rather than hurt.
- **A record's workflows are tabs; its fields are sections.** Tabs only when the panels are
  mutually exclusive (`Details` / `Items` / `Activity`); the key-facts strip and the header
  action sit _outside_ them so they survive every tab. Within a tab, group fields into named
  sections (UxGuide §2).

## How the data layer works (no backend)

`shared/lib/api-client.ts` is the only seam. Today it routes to the **mock backend** in
`shared/lib/mock/` which:

1. evaluates the same **Gridify query strings** the client builds (the evaluator in
   `gridify.ts` mirrors the escaping/case-insensitive rules of `gridify-client`, so a real
   .NET Gridify API later needs **zero** client changes);
2. pages/sorts/filters a deterministic in-memory seed (~1 200 orders spread over ~26 months,
   enough to compare a year-to-date window with the same period last year);
3. simulates 180–420 ms latency and logs every request.

Mutations (`POST /api/orders`, `PATCH /api/orders/:id/status`) really mutate the in-memory
store; a page refresh reseeds. Reads cover the paged `GET /api/orders`, the `GET /api/orders/aggregate`
totals, and the single-record `GET /api/orders/:orderNo` the detail page consumes. Swapping in a real
backend = point `api-client.ts` at it (the `fetch` branch is already written).

## Visual

Shell, sidebar, dark toggle and the **Verdant** palette (green-on-green) are reused verbatim
from `Federation/lazy`; MonthPicker/YearPicker/MultiSelect were ported from its showcase into
`shared/components/ui` and extended with UTC-based day and range pickers. `MultiSelect` now wraps
the shadcn _base-nova_ `combobox` primitive (vendored as `ui/combobox.tsx` + `ui/input-group.tsx`):
selected values are removable chips in the field, the input filters the list, and Base UI owns the
keyboard model — while the public API stays `{ options, value: string[], onChange }`. The field is
a **fixed size** (`h-11 w-64`, overridable via `className`): one full chip row is visible, the next
wrapped row peeks through a mask fade, and the rows scroll **vertically** with the scrollbar hidden
(`no-scrollbar` + `fade-y-*`). Nothing resizes as selections change, and a pinned clear-all sits
outside the scroll area.
