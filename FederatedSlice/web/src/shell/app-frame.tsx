import { Link, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, LogOut } from "lucide-react";

import { useActiveNav, useMicroApps } from "./nav";
import { useShell } from "./shell-provider";

const navItem =
  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
const navItemActive = `${navItem} bg-sidebar-accent text-sidebar-accent-foreground`;

/**
 * The shell: sidebar (each app and its pages, from the route tree), header with
 * the open app and page, the app itself, and the event bus in the footer. An app renders in
 * the `Outlet`; its chunk loads on first visit, and if it throws, the router's
 * error boundary replaces only the app, never the shell (`router.tsx`).
 */
export function AppFrame() {
  const apps = useMicroApps();
  const active = useActiveNav();
  const { user, signOut, events } = useShell();
  const latest = events.at(-1);

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <aside className="sticky top-0 flex h-svh w-56 shrink-0 flex-col border-r bg-sidebar p-3">
        <div className="px-3 py-2 text-sm font-semibold">Front base · federated</div>
        <nav aria-label="Apps" className="mt-2 flex flex-col gap-1">
          <Link
            to="/"
            className={navItem}
            activeProps={{ className: navItemActive }}
            activeOptions={{ exact: true }}
          >
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
          {apps.map((app) => (
            <div key={app.path} className="mt-3 flex flex-col gap-1">
              <span className="flex items-center gap-2 px-3 text-xs font-medium text-muted-foreground">
                <app.icon className="size-3.5" />
                {app.title}
              </span>
              {app.pages.map((page) => (
                <Link
                  key={page.path}
                  to={page.path}
                  className={navItem}
                  activeProps={{ className: navItemActive }}
                >
                  <page.icon className="size-4" />
                  {page.title}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2 px-3 py-2 text-sm">
          <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-xs font-medium text-secondary-foreground">
            {user.initials}
          </span>
          <span className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b px-6 text-sm">
          <span className="text-muted-foreground">{active.app?.title ?? "Platform"}</span>
          <span className="mx-2 text-muted-foreground">/</span>
          <span className="font-medium">{active.page?.title ?? "Dashboard"}</span>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
        <footer
          aria-live="polite"
          className="border-t px-6 py-3 font-mono text-xs text-muted-foreground"
        >
          {latest
            ? `event bus · ${events.length} event(s) · latest: [${latest.source}] ${latest.message}`
            : "event bus · idle"}
        </footer>
      </div>
    </div>
  );
}
