import type * as React from "react";
import { AudioWaveform, Command, GalleryVerticalEnd } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavMain, type NavItem } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { useNav } from "@/shell/nav";

// Shell chrome not tied to routes.
const data = {
  user: {
    name: "Ada Lovelace",
    email: "ada@acme.example",
    initials: "AL",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Navigation comes from the route tree: every route file under src/routes/
  // with a `staticData.nav` block shows up here automatically.
  const { groups } = useNav();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items: NavItem[] = groups.map((group) => ({
    title: group.name,
    url: group.children[0]?.path ?? "#",
    icon: group.icon,
    isActive: group.children.some((page) => page.path === pathname),
    items: group.children.map((page) => ({
      title: page.name,
      url: page.path,
    })),
  }));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
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
