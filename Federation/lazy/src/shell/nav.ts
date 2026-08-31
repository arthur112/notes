import { useRouter } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";

/**
 * Metadata a route file declares in its `staticData` to appear in the shell
 * navigation. Adding a new route file under `src/routes/` with a `nav` block
 * is all it takes — the sidebar and dashboard tiles pick it up automatically.
 */
export type NavMeta = {
  /** Label shown in the sidebar and on dashboard tiles. */
  title: string;
  /** Longer blurb shown on dashboard tiles. */
  description?: string;
  /** Top-level sidebar group; routes sharing a group name are merged. */
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
  /** The navigation tree — top-level groups, each with their pages. */
  groups: NavGroup[];
  /** The lazily loaded micro-app pages (every nav page except the dashboard), flattened. */
  microApps: MicroApp[];
};

type RouteLike = {
  fullPath: string;
  options: { staticData?: { nav?: NavMeta } };
};

/** Build the navigation tree from whatever routes the router has registered. */
function buildNav(routes: RouteLike[]): NavData {
  const pages = routes
    .filter(
      (
        route,
      ): route is RouteLike & { options: { staticData: { nav: NavMeta } } } =>
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

/**
 * The shell navigation, derived live from the router's route tree — which
 * `@tanstack/router-plugin` generates from the files in `src/routes/`.
 */
export function useNav(): NavData {
  const router = useRouter();
  return useMemo(
    () => buildNav(Object.values(router.routesById) as RouteLike[]),
    [router],
  );
}
