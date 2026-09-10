import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/shared/components/ui/tabs";
import { cn } from "@/shared/lib/utils";

export type DetailTab = {
  value: string;
  label: string;
  icon?: LucideIcon;
  /** How many items the panel holds (e.g. line items) — shown as a count badge. */
  count?: number;
  content: ReactNode;
};

export type DetailTabsProps = {
  tabs: DetailTab[];
  value: string;
  onValueChange: (value: string) => void;
  "aria-label": string;
  className?: string;
};

/**
 * Tabbed shell for a record whose sections are genuinely independent workflows
 * (UxGuide §3): reading the fields, inspecting the line items, and auditing the
 * history. The key-facts strip stays *above* this component so it is visible on
 * every tab; only the mutually exclusive panels change. Inactive panels are not
 * mounted until first activated (Base UI default), so a hidden tab costs nothing.
 */
export function DetailTabs({
  tabs,
  value,
  onValueChange,
  "aria-label": ariaLabel,
  className,
}: DetailTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(String(next));
      }}
      className={cn("gap-5", className)}
    >
      <TabsList aria-label={ariaLabel}>
        {tabs.map((tab) => (
          <TabsTab key={tab.value} value={tab.value}>
            {tab.icon && <tab.icon className="size-4" />}
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <Badge variant="secondary" className="px-1.5 py-0 tabular-nums">
                {tab.count}
              </Badge>
            )}
          </TabsTab>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsPanel key={tab.value} value={tab.value}>
          {tab.content}
        </TabsPanel>
      ))}
    </Tabs>
  );
}
