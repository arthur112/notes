import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import { ORDER_STATUSES, STATUS_META, type OrderStatus } from "../types/order";

/**
 * The single status control both order apps share. It is multi-select
 * (`value: []` means "All") and each pill carries the status dot, so state
 * reads at a glance instead of only inside a dropdown. Finance passes one
 * element (single-select); Ops passes many — same vocabulary, one component.
 */
export function StatusPills({
  value,
  onChange,
  ariaLabel = "Status filter",
  className,
}: {
  value: OrderStatus[];
  onChange: (next: OrderStatus[]) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const allSelected = value.length === 0;
  const toggle = (status: OrderStatus) =>
    onChange(value.includes(status) ? value.filter((s) => s !== status) : [...value, status]);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-lg bg-muted p-0.5",
        className,
      )}
    >
      <Pill selected={allSelected} onClick={() => onChange([])}>
        All
      </Pill>
      {ORDER_STATUSES.map((status) => (
        <Pill key={status} selected={value.includes(status)} onClick={() => toggle(status)}>
          <span
            className={cn("size-1.5 shrink-0 rounded-full", STATUS_META[status].dotClass)}
            aria-hidden
          />
          {STATUS_META[status].label}
        </Pill>
      ))}
    </div>
  );
}

function Pill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm whitespace-nowrap transition-colors",
        selected
          ? "bg-background font-medium text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
