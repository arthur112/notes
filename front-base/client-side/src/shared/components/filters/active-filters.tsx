import { X } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";

export type ActiveFilter = {
  key: string;
  /** `Field: Value`, already using display labels (never raw enum values). */
  label: string;
  onClear: () => void;
};

/**
 * The one canonical "what is narrowing this result set" row. It carries the
 * filters that have no visible control of their own (i.e. the ones tucked
 * inside the Filters popover) plus a single trailing **Clear all filters**
 * action. Filters that already show their value in the toolbar (search, status
 * pills) deliberately do not produce a chip — no duplicated state.
 */
export function ActiveFilters({
  filters,
  onClearAll,
  activeCount = filters.length,
}: {
  filters: ActiveFilter[];
  onClearAll: () => void;
  /** Total narrowing filters, including ones with their own visible control. */
  activeCount?: number;
}) {
  if (filters.length === 0 && activeCount === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((filter) => (
        <Badge key={filter.key} variant="outline" className="gap-0.5 py-0.5 pr-0.5 font-normal">
          {filter.label}
          <button
            type="button"
            aria-label={`Remove filter ${filter.label}`}
            onClick={filter.onClear}
            className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        Clear all filters
      </button>
    </div>
  );
}
