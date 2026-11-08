# Federation

A dashboard shell that loads micro-applications **at runtime, when you click a tile**, with true
**Module Federation** (`@module-federation/vite`): a host and two separately-built remotes, each on
its own server. The code is in [`mf/`](mf/) (see its README for the configuration details).

## The decision in one paragraph

Module federation's real selling points are **independent deployment** and **independent scaling** of
separately-built bundles. If you don't need those, it buys you complexity: multiple builds/servers,
shared-dependency singleton configuration, version drift between remotes, and no type safety across
boundaries. A single Vite build with `import()` per app gives you the **same user-visible behavior** —
the browser downloads an app's bundle the first time you open it — while keeping one dependency tree,
one React instance (so context just works), full type safety, and atomic deploys. Reach for MF when an
org chart, not a performance graph, demands it. The single-build alternative (TanStack Router
`autoCodeSplitting`, one lazy chunk per page) is the shell in the
[`FederatedSlice`](../FederatedSlice/web) note.

## What's demonstrated

- A **dashboard** with one tile per micro-app. Clicking a tile is what triggers the download of
  that app's `remoteEntry.js` and exposed module (verify in the Network tab).
- **Invoices** remote: a table that publishes an event to the shell when a row is selected.
- **Reports** remote: a small chart plus a view of what other apps published.
- **Shared shell services**: user context + an event bus. The host passes them as props
  (`ShellServices`), the pragmatic contract across a federation boundary.
- A **Suspense fallback + error boundary** per app, so a slow or broken remote never kills the shell.

## Running

Three apps, three servers: `host` (5000), `remote-invoices` (5001), `remote-reports` (5002) —
wired up as a bun workspace so one command starts everything:

```bash
cd mf
bun install
bun run dev        # → http://localhost:5000 (Ctrl+C stops all three)
```

Remotes can also be opened standalone (<http://localhost:5001>, <http://localhost:5002>) for
isolated development. Note the costs visible in the setup: per-app Vite configs with `shared`
singletons (`react`, `react-dom`), ambient module declarations (`host/src/remotes.d.ts`) because the
imported modules don't exist at compile time, and CORS/port coordination.

## Hosting on IIS — three applications

All three are static files after `bun run build`, so IIS needs no Node.

1. `bun run build` in `mf/` → deploy each of `host/dist`, `remote-invoices/dist`,
   `remote-reports/dist`.
2. **Prefer one site with virtual directories** (`/` = host, `/remotes/invoices`,
   `/remotes/reports`): same-origin means no CORS. Separate sites/servers work too, but then each
   remote needs `Access-Control-Allow-Origin` headers — see `mf/remote-cors.web.config.sample`.
3. **Remote URLs are baked into the host at build time**: point the `entry:` URLs in
   `mf/host/vite.config.ts` at the production `remoteEntry.js` locations before building, and set
   each remote's `base` to its deployed path.
4. `mf/host/public/web.config` ships an SPA fallback (only needed if the host gains client-side
   routing; it requires IIS's **URL Rewrite module**). Remotes serve files only and need no rewrites.

## Decision table

| | Lazy chunks (one build) | Module federation (`mf/`) |
| --- | --- | --- |
| Builds / servers | 1 | 3 (one per app) |
| Deploy apps independently | No — atomic, all together | Yes |
| Scale apps independently | No | Yes (separate artifacts) |
| Shared React/context | Free — one instance | Must configure `shared` singletons carefully |
| Type safety across boundary | Full | Manual (`.d.ts`, shared types package, or DTS plugin) |
| Version drift risk | None — one lockfile | Real — each remote has its own deps |
| Runtime failure mode | Build-time errors catch breakage | Remote can be down/wrong version at runtime |
| Best for | One team / one release train | Multiple teams, independent release cadence |
