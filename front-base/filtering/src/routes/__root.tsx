import type { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <main className="min-h-svh bg-background text-foreground">
      <Outlet />
    </main>
  ),
});
