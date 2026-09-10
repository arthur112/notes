import type * as React from "react";
import { useRouterState } from "@tanstack/react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/shared/components/ui/sidebar";
import { AppSwitcher } from "./app-switcher";
import { NavMain, type NavItem } from "./nav-main";
import { NavUser } from "./nav-user";
import { useNav, isNavPathActive } from "./nav";

const data = {
  user: {
    name: "Alex Chen",
    email: "alex@frontbase.example",
    initials: "AC",
  },
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { groups } = useNav();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items: NavItem[] = groups.map((group) => ({
    title: group.name,
    url: group.children[0]?.path ?? "#",
    icon: group.icon,
    isActive: group.children.some((page) => isNavPathActive(page.path, pathname)),
    items: group.children.map((page) => ({ title: page.name, url: page.path })),
  }));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
