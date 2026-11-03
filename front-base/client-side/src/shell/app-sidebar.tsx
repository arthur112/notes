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
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { APPS, isNavPathActive, useActiveApp, useNav } from "./nav";

const data = {
  user: {
    name: "Alex Chen",
    email: "alex@frontbase.example",
    initials: "AC",
  },
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pages } = useNav();
  const app = useActiveApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Only the selected app's pages: switching app swaps the whole menu.
  const items = pages
    .filter((page) => page.app === app)
    .map((page) => ({
      title: page.title,
      url: page.path,
      icon: page.icon,
      isActive: isNavPathActive(page.path, pathname),
    }));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain label={APPS[app].name} items={items} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
