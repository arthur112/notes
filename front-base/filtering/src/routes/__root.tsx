import type { QueryClient } from "@tanstack/react-query";
import { Link, Outlet, createRootRouteWithContext } from "@tanstack/react-router";

const navItem =
  "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
const navItemActive = `${navItem} bg-muted text-foreground`;

/** A small shell so the two filtered domains are reachable from anywhere. */
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <nav aria-label="Filter domains" className="mx-auto flex max-w-5xl items-center gap-1 p-4">
          <span className="mr-3 text-sm font-semibold">Front base · filtering</span>
          <Link
            to="/orders"
            className={navItem}
            activeProps={{ className: navItemActive }}
            activeOptions={{ exact: false }}
          >
            Orders
          </Link>
          <Link
            to="/customers"
            className={navItem}
            activeProps={{ className: navItemActive }}
            activeOptions={{ exact: false }}
          >
            Customers
          </Link>
        </nav>
      </header>
      <Outlet />
    </main>
  ),
});
