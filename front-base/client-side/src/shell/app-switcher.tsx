import { Link } from "@tanstack/react-router";
import { ChevronsUpDown } from "lucide-react";
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

import { useActiveApp, useNav } from "./nav";

// `Link` with `to` widened to `string`: the switchable apps come from the route
// tree at runtime, so they can't be narrowed to the registered path union.
const AppLink = Link as (
  props: { to: string } & Omit<ComponentProps<"a">, "href">,
) => ReactElement | null;

/**
 * Sidebar-header app switcher. Picking an app navigates to its home page; the
 * selection itself is read back from the URL (`useActiveApp`), so the sidebar,
 * breadcrumb and accent follow without any shared state.
 */
export function AppSwitcher() {
  const { isMobile } = useSidebar();
  const { apps } = useNav();
  const activeId = useActiveApp();
  const active = apps.find((app) => app.id === activeId) ?? apps[0];

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />}
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <active.icon className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{active.name}</span>
              <span className="truncate text-xs">{active.description}</span>
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
                  key={app.id}
                  render={<AppLink to={app.home} />}
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
