import { useMatches, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, Landmark, Shapes, ShoppingCart, type LucideIcon } from "lucide-react";
import { useMemo } from "react";

/**
 * The apps the switcher offers. Declared once here; a page joins an app by
 * naming it in its route's `staticData.nav.app`. The active app scopes the
 * sidebar, titles the breadcrumb and picks the accent (`<html data-app>`).
 */
export const APPS = {
  platform: { name: "Platform", description: "Sales KPIs, year over year", icon: LayoutDashboard },
  orders: { name: "Orders", description: "Ops desk and finance view", icon: ShoppingCart },
  lending: { name: "Lending", description: "Mortgage contract records", icon: Landmark },
  components: { name: "Components", description: "Shared UI gallery", icon: Shapes },
} satisfies Record<string, { name: string; description: string; icon: LucideIcon }>;

export type AppId = keyof typeof APPS;

/**
 * Metadata a route file declares in its `staticData` to appear in the shell
 * navigation. Adding a route file under `src/routes/` with a `nav` block is
 * all it takes — sidebar, switcher and breadcrumb pick it up automatically.
 */
export type NavMeta = {
  title: string;
  description?: string;
  app: AppId;
  icon: LucideIcon;
};

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    nav?: NavMeta;
  }
}

export type NavPage = NavMeta & { path: string };

export type NavApp = (typeof APPS)[AppId] & { id: AppId; home: string };

type RouteLike = {
  fullPath: string;
  options: { staticData?: { nav?: NavMeta } };
};

function buildNav(routes: RouteLike[]): { pages: NavPage[]; apps: NavApp[] } {
  const pages = routes
    .flatMap((route) => {
      const nav = route.options.staticData?.nav;
      return nav ? [{ ...nav, path: route.fullPath }] : [];
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  // An app with no page is not offered; its home is its first page.
  const apps = (Object.keys(APPS) as AppId[]).flatMap((id) => {
    const home = pages.find((page) => page.app === id)?.path;
    return home ? [{ ...APPS[id], id, home }] : [];
  });

  return { pages, apps };
}

/** The shell navigation, derived live from the router's route tree. */
export function useNav() {
  const router = useRouter();
  return useMemo(() => buildNav(Object.values(router.routesById) as RouteLike[]), [router]);
}

/**
 * The selected app — read from the URL, not stored: the deepest matched route
 * that declares `nav` wins, so a record (`/apps/orders-ops/ORD-1`) inherits its
 * layout's app. Reloads, shared links and Back all keep the selection.
 */
export function useActiveApp(): AppId {
  return useMatches({
    select: (matches) =>
      matches.findLast((m) => m.staticData.nav)?.staticData.nav?.app ?? "platform",
  });
}

/**
 * Whether `pathname` belongs to a nav entry. Prefix-aware so a nested route
 * (`/apps/orders-ops/ORD-100123`) keeps its page active in the sidebar. The
 * dashboard is matched exactly so `/` doesn't own every path.
 */
export function isNavPathActive(pagePath: string, pathname: string): boolean {
  if (pagePath === "/") return pathname === "/";
  return pathname === pagePath || pathname.startsWith(`${pagePath}/`);
}
