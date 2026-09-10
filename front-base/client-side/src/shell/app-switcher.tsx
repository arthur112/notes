import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronsUpDown, LayoutDashboard } from "lucide-react";
import type { ComponentProps, ReactElement } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/shared/components/ui/sidebar";

import { useNav, isNavPathActive } from "./nav";

export type SwitchableApp = {
  path: string;
  name: string;
  description: string;
  group: string;
  icon: typeof LayoutDashboard;
};

// `Link` with `to` widened to `string`: the switchable apps come from the route
// tree at runtime, so they can't be narrowed to the registered path union.
const AppLink = Link as (
  props: { to: string } & Omit<ComponentProps<"a">, "href">,
) => ReactElement | null;

/**
 * Header app switcher — the primary way to move between the dashboard and the
 * micro-apps. The list is derived from the same `staticData.nav` metadata that
 * feeds the sidebar, so a new route appears here automatically.
 */
export function AppSwitcher() {
  const { isMobile } = useSidebar();
  const { microApps } = useNav();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const active = microApps.find((app) => isNavPathActive(app.path, pathname));
  const ActiveIcon = active?.icon ?? LayoutDashboard;
  const activeName = active?.name ?? "Dashboard";
  const activeGroup = active?.group ?? "Platform";

  const apps: SwitchableApp[] = [
    {
      path: "/",
      name: "Dashboard",
      description: "Sales KPIs, year over year",
      group: "Platform",
      icon: LayoutDashboard,
    },
    ...microApps,
  ];

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />}
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <ActiveIcon className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{activeName}</span>
              <span className="truncate text-xs">{activeGroup}</span>
            </div>
            <ChevronsUpDown className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-60"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Apps</DropdownMenuLabel>
              {apps.map((app) => (
                <DropdownMenuItem
                  key={app.path}
                  render={<AppLink to={app.path} />}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <app.icon className="size-3.5 shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate">{app.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{app.description}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
