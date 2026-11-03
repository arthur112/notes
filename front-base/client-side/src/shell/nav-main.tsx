import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactElement } from "react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/components/ui/sidebar";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive: boolean;
};

// `Link` with `to` widened to `string`: sidebar entries come from the route
// tree at runtime, so they can't be narrowed to the registered path union.
const NavLink = Link as (
  props: { to: string } & Omit<ComponentProps<"a">, "href">,
) => ReactElement | null;

/** The active app's pages, as a flat list under the app's name. */
export function NavMain({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              isActive={item.isActive}
              tooltip={item.title}
              render={<NavLink to={item.url} />}
            >
              <item.icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
