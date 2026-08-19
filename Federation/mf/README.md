# mf/ — Module Federation variant

True runtime federation with [`@module-federation/vite`](https://www.npmjs.com/package/@module-federation/vite).

- `host/` — dashboard shell (port 5000). Loads remotes on tile click via `React.lazy(() => import('invoices/App'))`.
- `remote-invoices/` — exposes `./App` (port 5001).
- `remote-reports/` — exposes `./App` (port 5002).

## Run

One install, one command (bun workspace + `dev.sh` starts all three):

```bash
bun install
bun run dev        # → http://localhost:5000 (Ctrl+C stops everything)
```

`bun run build` builds all three apps.

Each remote also works standalone for isolated development (http://localhost:5001, http://localhost:5002).

## Hosting on IIS

`bun run build` produces three static `dist/` folders — deploy each as an IIS application.
Prefer one site with virtual directories (`/` = host, `/remotes/invoices`, `/remotes/reports`)
to stay same-origin; for separate sites, each remote needs CORS headers — see
[`remote-cors.web.config.sample`](remote-cors.web.config.sample). Remember the host bakes the
remote URLs in at build time (`entry:` in `host/vite.config.ts`), and set each remote's `base`
to its deployed path.

## Points of interest

- **Shared services cross the boundary as props** (`ShellServices`: user + event bus). The type is
  duplicated in each app; a real multi-repo setup would publish it as a small shared package.
- `react` / `react-dom` are configured as **singletons** in all three `vite.config.ts` files —
  without this you get two Reacts and hook errors.
- `build.target: 'esnext'` — module federation output uses top-level await.
- The host declares the remote modules in `src/remotes.d.ts` because they don't exist at compile
  time. (The `@module-federation/vite` DTS plugin can generate these instead.)
- The host's error boundary catches an unreachable remote and offers a way back to the dashboard.
