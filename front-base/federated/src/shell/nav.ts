import { useMatches, useRouter } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";

/**
 * What routes declare in `staticData` to join the shell. An app's layout
 * (`src/routes/<app>/route.tsx`) declares `app`; each of its pages' layout
 * (`src/routes/<app>/orders/route.tsx`) declares `page`. The sidebar, the
 * dashboard tiles and the header pick them up; the shell itself never changes.
 */
export type AppMeta = { title: string; description: string; icon: LucideIcon };
export type PageMeta = { title: string; icon: LucideIcon };

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    app?: AppMeta;
    page?: PageMeta;
  }
}

export type NavPage = PageMeta & { path: string };
export type MicroApp = AppMeta & { path: string; pages: NavPage[] };

type RouteLike = { fullPath: string; options: { staticData?: { app?: AppMeta; page?: PageMeta } } };

/** The apps and their pages, derived from the route tree the router plugin generates. */
export function useMicroApps(): MicroApp[] {
  const router = useRouter();
  return useMemo(() => {
    const routes = (Object.values(router.routesById) as RouteLike[]).sort((a, b) =>
      a.fullPath.localeCompare(b.fullPath),
    );
    return routes.flatMap(({ fullPath: path, options }) => {
      const app = options.staticData?.app;
      if (!app) return [];
      const pages = routes.flatMap(({ fullPath, options }) => {
        const page = options.staticData?.page;
        return page && fullPath.startsWith(`${path}/`) ? [{ ...page, path: fullPath }] : [];
      });
      return [{ ...app, path, pages }];
    });
  }, [router]);
}

/**
 * The open app and page, read from the matched routes (not stored): the
 * deepest match declaring each wins, so `/app1/orders/new` is App 1 › Orders.
 */
export function useActiveNav(): { app?: AppMeta; page?: PageMeta } {
  // Two selects, each returning the route's own (stable) staticData object.
  const app = useMatches({
    select: (matches) => matches.findLast((m) => m.staticData.app)?.staticData.app,
  });
  const page = useMatches({
    select: (matches) => matches.findLast((m) => m.staticData.page)?.staticData.page,
  });
  return { app, page };
}
