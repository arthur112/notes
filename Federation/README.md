# Federation

A dashboard shell that loads micro-applications **on demand, when you click a tile** — demonstrated
two ways, because "federation" is often reached for when plain code splitting is the better fit.

| Folder | Approach | When to use it |
| --- | --- | --- |
| [`lazy/`](lazy/) | One Vite build; each app is a route-level **lazy chunk** via TanStack Router (file-based routing) | Default choice. You deploy everything together and don't need per-app scaling. |
| [`mf/`](mf/) | True **Module Federation** (`@module-federation/vite`): host + 2 separately-built remotes loaded at runtime | Only when you need independent deployment per app, or independent teams shipping on their own cadence. |

## The decision in one paragraph

Module federation's real selling points are **independent deployment** and **independent scaling** of
separately-built bundles. If you don't need those, it buys you complexity: multiple builds/servers,
shared-dependency singleton configuration, version drift between remotes, and no type safety across
boundaries. A single Vite build with `import()` per app gives you the **same user-visible behavior** —
the browser downloads an app's bundle the first time you open it — while keeping one dependency tree,
one React instance (so context just works), full type safety, and atomic deploys. Reach for MF when an
org chart, not a performance graph, demands it.

## What's demonstrated

Both variants share the same demo shape:

- A **dashboard** with one tile per micro-app. Clicking a tile is what triggers the download of that
  app's code (verify in the Network tab).
- **Invoices** app: a table that publishes an event to the shell when a row is selected.
- **Reports** app: a small chart plus a view of what other apps published.
- **Shared shell services**: user context + an event bus. In `lazy/` the apps consume a React context
  directly (same module instance — free). In `mf/` the host passes the services as props
  (`ShellServices`), the pragmatic contract across a federation boundary.
- A **Suspense fallback + error boundary** per app, so a slow or broken app never kills the shell.

## Running

### `lazy/` — lazy chunks, single build

```bash
cd lazy
bun install
bun run dev        # http://localhost:5173
```

Click a tile and watch the Network tab: `invoices-*.js` / `reports-*.js` download on first
navigation only. `bun run build` shows the same split in `dist/`:

```
dist/assets/invoices-*.js
dist/assets/reports-*.js
dist/assets/index-*.js        # shell + shared code (React, router, shell services)
```

Key piece — file-based routes with TanStack Router. Each file under `lazy/src/routes/` is a
route; `@tanstack/router-plugin` (Vite) generates the route tree and, with
`autoCodeSplitting: true`, turns each route's `component` into a lazily fetched chunk. The
`staticData.nav` block is what puts the page in the sidebar and on the dashboard — both are
derived from the route tree (`lazy/src/shell/nav.ts`), so adding a route file is all it takes
to add a micro-app:

```tsx
// lazy/src/routes/apps/invoices.tsx
export const Route = createFileRoute('/apps/invoices')({
  component: App, // auto-split into its own chunk
  staticData: {
    nav: { title: 'Invoices', description: '…', group: 'App 1', icon: ReceiptText },
  },
})
```

Micro-apps are plain folders under `src/apps/` — no plugin, no extra config.

### `mf/` — module federation

Three apps, three servers: `host` (5000), `remote-invoices` (5001), `remote-reports` (5002) —
wired up as a bun workspace so one command starts everything:

```bash
cd mf
bun install
bun run dev        # → http://localhost:5000 (Ctrl+C stops all three)
```

Clicking a tile downloads `remoteEntry.js` plus the exposed module from the remote's server at
runtime. Remotes can also be opened standalone (<http://localhost:5001>, <http://localhost:5002>) for
isolated development. Note the costs visible in the setup: per-app Vite configs with `shared`
singletons (`react`, `react-dom`), ambient module declarations (`host/src/remotes.d.ts`) because the
imported modules don't exist at compile time, and CORS/port coordination.

## Hosting on IIS

Both variants are static files after `bun run build` — IIS needs no Node, but mind the per-variant
notes below.

### `lazy/` on IIS — one site

1. `bun run build` → point an IIS site or application at `lazy/dist/`.
2. **SPA fallback**: TanStack Router uses history-API routing, so deep links (`/apps/invoices`)
   would 404 on refresh. `lazy/public/web.config` (copied into `dist/` automatically) rewrites
   non-file requests to `index.html`. It requires the **URL Rewrite module** — a separate IIS
   download and the most common gotcha.
3. Hosting under a **sub-application** (`https://server/federation/`)? Also set
   `base: '/federation/'` in `vite.config.ts` and `createRouter({ basepath: '/federation' })`
   in `src/router.tsx`.

### `mf/` on IIS — three applications

1. `bun run build` in `mf/` → deploy each of `host/dist`, `remote-invoices/dist`,
   `remote-reports/dist`.
2. **Prefer one site with virtual directories** (`/` = host, `/remotes/invoices`,
   `/remotes/reports`): same-origin means no CORS. Separate sites/servers work too, but then each
   remote needs `Access-Control-Allow-Origin` headers — see `mf/remote-cors.web.config.sample`.
3. **Remote URLs are baked into the host at build time**: point the `entry:` URLs in
   `mf/host/vite.config.ts` at the production `remoteEntry.js` locations before building, and set
   each remote's `base` to its deployed path.
4. `mf/host/public/web.config` ships the same SPA fallback (only needed if the host gains
   client-side routing); remotes serve files only and need no rewrites.

Same story as in dev: one IIS application to deploy and keep aligned for `lazy/`, three for `mf/`.

## Decision table

| | Lazy chunks (`lazy/`) | Module federation (`mf/`) |
| --- | --- | --- |
| Builds / servers | 1 | 3 (one per app) |
| Deploy apps independently | No — atomic, all together | Yes |
| Scale apps independently | No | Yes (separate artifacts) |
| Shared React/context | Free — one instance | Must configure `shared` singletons carefully |
| Type safety across boundary | Full | Manual (`.d.ts`, shared types package, or DTS plugin) |
| Version drift risk | None — one lockfile | Real — each remote has its own deps |
| Runtime failure mode | Build-time errors catch breakage | Remote can be down/wrong version at runtime |
| Best for | One team / one release train | Multiple teams, independent release cadence |
