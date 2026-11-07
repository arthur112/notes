# Front Base — federated

The [`filtering`](../filtering) sandbox (two filtered domains, Orders and Customers, built from one
config-driven filtering layer) rebuilt as **micro-apps inside a shell**, following the idea of
[`Federation/lazy`](../../Federation/lazy): one Vite build, one lazy chunk per page, a dashboard that
links to each app, and shell services shared through plain React context.

Each app (`app1`, `app2`) has its own **orders** and **customers** slots. A slot starts from the
**domain defaults** (`src/domains/`) and replaces a piece only when that app needs something
different: App 1 takes every default, App 2 has its own order columns and no order creation.

The filtering layer, both filter definitions, the mock APIs, the table and the order form are
`filtering`'s code, moved and made route-agnostic but not rewritten. Their README remains the
reference for the URL-as-filter loop, the field builders, Gridify and TanStack Form. This README
covers what the shell and the app/domain split add.

## Three layers

| Layer                        | Owns                                                                                                                                                           | Knows routes?                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `src/domains/<entity>/`      | What every app shares about an entity: filter definition, queries, list-route options, columns (set + single columns), the list, the order form and its pages. | No: search, `onPatch`, links and `onDone` come in as props. |
| `src/apps/<app>/<entity>/`   | The app's pages for that entity. Thin by default (wiring the domain to the app's routes), its own components where it differs.                                 | Yes, its own (`getRouteApi("/app1/orders/")`).              |
| `src/routes/<app>/<entity>/` | URL, `staticData` (sidebar/header), and which app page renders. Spreads the domain's list-route options (`...ordersListRoute`).                                | It is the routes.                                           |

Why the domain is route-agnostic: one domain component serves `/app1/orders` and `/app2/orders`, so
it can't call `getRouteApi` or link to a fixed path. The app's page reads its route and passes in:

| Prop                      | Domain piece                     | App 1 passes                                      |
| ------------------------- | -------------------------------- | ------------------------------------------------- |
| `search`, `onPatch`       | `OrdersList`, `CustomersList`    | `listRoute.useSearch()`, a `navigate({ search })` |
| `columns`, `action`       | `OrdersList`                     | `orderColumns(link)`, its "New order" link        |
| link per order number     | `orderColumns` / `orderNoColumn` | `<Link to="/app1/orders/$orderNo">`               |
| `onDone` (saved / Cancel) | `NewOrder`, `EditOrder`          | `navigate({ to: ".." })`                          |

### Diverging when needed

App 2's orders page (`apps/app2/orders/pages.tsx`) builds its own column set from the domain's
single columns and leaves out the header action:

```tsx
const columns = orderColumnHelper.columns([
  orderNoColumn((orderNo) => (
    <Link to="/app2/orders/$orderNo" params={{ orderNo }}>
      {orderNo}
    </Link>
  )),
  customerColumn,
  totalColumn,
]);
```

Going further is the same move: the app writes its own component (a different list, a detail
view instead of the form, its own `defineFilter` with fewer fields) and imports that instead of the
domain's. Nothing else changes: not the other app, not the domain, not the shell.

## What the shell adds

| Idea (from Federation)                 | Here                                                                                                                                                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nav from the route tree**            | `routes/<app>/route.tsx` declares `staticData.app` (title, description, icon); `routes/<app>/<entity>/route.tsx` declares `staticData.page`. Sidebar groups, dashboard tiles and header derive from them (`shell/nav.ts`). |
| **Lazy per page**                      | `autoCodeSplitting` turns each route's `component` into a chunk, so a page, its columns and the form download on first open.                                                                                               |
| **Shell services**                     | `ShellProvider`: the signed-in user and an event bus (`publish(source, message)`). Everything shares the one module instance, so it is a plain context with no federation contract.                                        |
| **A broken app never kills the shell** | `defaultErrorComponent` / `defaultPendingComponent` on the router (`shell/app-states.tsx`): the router's own boundaries render inside the root outlet, so sidebar, header and footer stay.                                 |
| **Apps don't import each other**       | Lint-enforced (`.oxlintrc.json`, `no-restricted-imports`): `apps`, `domains`, `shared`, `api` and `shell` may not import `@/apps/**`, `@/routes/**` or `../../**`. Only `src/routes` wires apps in.                        |

Saving an order (in either app) publishes `Created ORD-…` / `Updated ORD-…` on the bus
(`domains/orders/order-form/order-form.tsx`); the footer shows it across apps.

## Routes

| URL                      | App 1 | App 2 | Page (`apps/<app>/…/pages.tsx`)   |
| ------------------------ | ----- | ----- | --------------------------------- |
| `/<app>/orders`          | ✓     | ✓     | `OrdersPage` (App 2: own columns) |
| `/<app>/orders/new`      | ✓     |       | `NewOrderPage`                    |
| `/<app>/orders/$orderNo` | ✓     | ✓     | `OrderPage` (the edit form)       |
| `/<app>/customers`       | ✓     | ✓     | `CustomersPage` (domain defaults) |

Both apps hit the same query keys (`["orders", search]`), so the cache, the mock and the request log
are shared: an order saved in App 2 shows up in App 1's list.

## Chunks (`bun run build`)

| Lazy (on first open)                                                                                                                       | Eager (at startup)                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard; each app page (< 1 kB); the shared filter bar / table / diagnostics (~37 kB, on the first list opened); the order form (~78 kB) | Shell, router, React Query; **the domains' filter definitions and the whole filtering layer** (field controls, Base UI, zod, date-fns: the `fields` chunk) |

The second column is the known gap. A list route's `validateSearch` and `loader` must be there before
its page, so they stay in the main chunk, and they import the domain's `filter.ts`, whose field
builders carry their control components. Moving the controls behind `lazy()` in
`shared/filtering/fields.tsx` would leave only the schemas (zod, date-fns, gridify) eager.

## Layout

```text
src/
├─ api/                    # backend contract + mock: orders, customers (+ the shared customer-options query)
├─ domains/
│  ├─ orders/              # filter, use-orders (queries + list-route options + order loader), columns, orders-list, order-form/
│  └─ customers/           # filter (+ test), use-customers (queries + list-route options), columns, customers-list
├─ apps/
│  ├─ app1/                # orders/pages.tsx · customers/pages.tsx — domain defaults
│  └─ app2/                # orders/pages.tsx (own columns) · customers/pages.tsx
├─ shared/                 # filtering layer, form kit, UI controls, lib — as in filtering
├─ shell/
│  ├─ app-frame.tsx        # sidebar (apps › pages from the route tree), header, outlet, event-bus footer
│  ├─ dashboard.tsx        # one tile per app
│  ├─ nav.ts               # AppMeta / PageMeta, useMicroApps, useActiveNav
│  ├─ shell-provider.tsx   # user + event bus
│  └─ app-states.tsx       # router-wide pending / error components
├─ router.tsx              # QueryClient + router (context, default pending/error)
└─ routes/
   ├─ __root.tsx           # AppFrame
   ├─ index.tsx            # / → Dashboard
   ├─ app1/                # route.tsx (app) · orders/{route (page), index, new, $orderNo} · customers/{route, index}
   └─ app2/                # same, without orders/new
```

Adding an app: `src/apps/<app>/<entity>/pages.tsx` plus `src/routes/<app>/` (a `route.tsx` with
`app`, each entity's `route.tsx` with `page`). Adding an entity to an app: its pages and route
folder. Nothing in the shell or the other apps changes.

## Running

```bash
cd front-base/federated
bun install
bun run dev      # http://localhost:5173
bun run build    # tsr generate && tsc --noEmit && vite build
bun run lint     # includes the app-boundary rule
bun run test     # vitest: the Gridify query each field and the customers filter produce
```

Checked in headless Chromium: the sidebar lists App 1 and App 2, each with Customers and Orders. App
2's orders show `Order | Customer | Total` with no "New order". Saving ORD-100103 from App 2 returns
to `/app2/orders` and the footer shows `Updated ORD-100103`. App 1's orders show all five columns,
`q=acme` reaches the URL, and New order → Cancel returns to `/app1/orders`. App 2's customers show
the domain columns, and `/app1/orders/ORD-999999` shows the error box inside the shell.
