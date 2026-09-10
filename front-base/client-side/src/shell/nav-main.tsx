import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactElement } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/shared/components/ui/sidebar";

export type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
};

// `Link` with `to` widened to `string`: sidebar entries come from the route
// tree at runtime, so they can't be narrowed to the registered path union.
const NavLink = Link as (
  props: { to: string } & Omit<ComponentProps<"a">, "href">,
) => ReactElement | null;

/** Sidebar navigation derived from the route tree (`staticData.nav`). */
export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          // Keying on `isActive` remounts the group when the active route moves,
          // so `defaultOpen` follows it without Base UI's uncontrolled-state warning.
          <Collapsible
            key={`${item.title}:${item.isActive}`}
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger render={<SidebarMenuButton tooltip={item.title} />}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton render={<NavLink to={subItem.url} />}>
                        <span>{subItem.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
