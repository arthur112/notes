import { useRouter } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";

/**
 * Metadata a route file declares in its `staticData` to appear in the shell
 * navigation. Adding a route file under `src/routes/` with a `nav` block is
 * all it takes — sidebar and dashboard tiles pick it up automatically.
 */
export type NavMeta = {
  title: string;
  description?: string;
  group: string;
  icon: LucideIcon;
};

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    nav?: NavMeta;
  }
}

export type NavPage = {
  path: string;
  name: string;
  description?: string;
};

export type NavGroup = {
  name: string;
  icon: LucideIcon;
  children: NavPage[];
};

export type MicroApp = NavPage & {
  description: string;
  group: string;
  icon: LucideIcon;
};

export type NavData = {
  groups: NavGroup[];
  microApps: MicroApp[];
};

type RouteLike = {
  fullPath: string;
  options: { staticData?: { nav?: NavMeta } };
};

function buildNav(routes: RouteLike[]): NavData {
  const pages = routes
    .filter(
      (route): route is RouteLike & { options: { staticData: { nav: NavMeta } } } =>
        route.options.staticData?.nav !== undefined,
    )
    .sort((a, b) => a.fullPath.localeCompare(b.fullPath));

  const groups: NavGroup[] = [];
  for (const route of pages) {
    const nav = route.options.staticData.nav;
    let group = groups.find((g) => g.name === nav.group);
    if (!group) {
      group = { name: nav.group, icon: nav.icon, children: [] };
      groups.push(group);
    }
    group.children.push({
      path: route.fullPath,
      name: nav.title,
      description: nav.description,
    });
  }

  const microApps = pages
    .filter((route) => route.fullPath !== "/")
    .map((route) => {
      const nav = route.options.staticData.nav;
      return {
        path: route.fullPath,
        name: nav.title,
        description: nav.description ?? "",
        group: nav.group,
        icon: nav.icon,
      };
    });

  return { groups, microApps };
}

/** The shell navigation, derived live from the router's route tree. */
export function useNav(): NavData {
  const router = useRouter();
  return useMemo(() => buildNav(Object.values(router.routesById) as RouteLike[]), [router]);
}

/**
 * Whether `pathname` belongs to a nav entry. Prefix-aware so a nested route
 * (`/apps/orders-ops/ORD-100123`) keeps its app active in the sidebar and
 * switcher. The dashboard is matched exactly so `/` doesn't own every path.
 */
export function isNavPathActive(pagePath: string, pathname: string): boolean {
  if (pagePath === "/") return pathname === "/";
  return pathname === pagePath || pathname.startsWith(`${pagePath}/`);
}
