import type { ReactNode } from "react";
import type { ReactTable } from "@tanstack/react-table";
import { Search } from "lucide-react";

import { ActiveFilters } from "@/shared/components/filters/active-filters";
import { FilterField } from "@/shared/components/filters/filter-field";
import { FilterPopover } from "@/shared/components/filters/filter-popover";
import {
  ColumnsMenu,
  DensityToggle,
  ResultsSummary,
  SelectionBar,
  type TableDensity,
} from "@/shared/components/table-tools";
import type { DataTableFeatures } from "@/shared/components/data-table";
import { Input } from "@/shared/components/ui/input";
import { SearchSelect, type MultiSelectOption } from "@/shared/components/ui/search-select";
import { DateRangePicker } from "@/shared/components/ui/date-picker";
import { StatusPills } from "@/shared/domain/orders";
import type { Channel, Order, OrderStatus } from "@/shared/domain/orders";
import { cn } from "@/shared/lib/utils";

import {
  countOpsActiveFilters,
  countOpsPopoverFilters,
  opsPopoverChips,
  type OpsFilters,
} from "../types/ops-orders-filters";

export type OpsToolbarProps = {
  filters: OpsFilters;
  onPatch: (patch: Partial<OpsFilters>) => void;
  onReset: () => void;
  channelOptions: MultiSelectOption[];
  /** Total rows matched by the current filters (server count). */
  count: number;
  /** A refetch is in flight. */
  busy: boolean;
  table: ReactTable<DataTableFeatures, Order>;
  density: TableDensity;
  onDensityChange: (next: TableDensity) => void;
  selectionCount: number;
  onClearSelection: () => void;
  /** Bulk actions rendered inside the selection bar. */
  bulkActions?: ReactNode;
};

/**
 * The Ops control surface: one always-visible search + status row, everything
 * else behind a single labelled `Filters (n)` popover, and a scope line that
 * states the result count and only the filters that have no control of their
 * own. Dumb by construction — all state is controlled by the page.
 */
export function OpsToolbar({
  filters,
  onPatch,
  onReset,
  channelOptions,
  count,
  busy,
  table,
  density,
  onDensityChange,
  selectionCount,
  onClearSelection,
  bulkActions,
}: OpsToolbarProps) {
  const popoverCount = countOpsPopoverFilters(filters);
  const activeCount = countOpsActiveFilters(filters);
  const chips = opsPopoverChips(filters, onPatch);
  const selecting = selectionCount > 0;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(event) => onPatch({ query: event.target.value })}
            placeholder="Search order no or customer…"
            className="h-9 pl-9"
            aria-label="Search orders by number or customer"
          />
        </div>

        <StatusPills
          value={filters.statuses}
          onChange={(statuses) => onPatch({ statuses: statuses as OrderStatus[] })}
        />

        <div className="flex items-center gap-2 sm:ml-auto">
          <FilterPopover activeCount={popoverCount} onClear={onReset}>
            <FilterField label="Channel">
              <SearchSelect
                options={channelOptions}
                value={filters.channel}
                onChange={(next) => onPatch({ channel: next as Channel | null })}
                placeholder="Any channel"
                ariaLabel="Channel"
                className="h-9 w-full"
              />
            </FilterField>

            <FilterField label="Created between">
              <DateRangePicker
                value={filters.period}
                onChange={(period) => onPatch({ period })}
                ariaLabel="Created period"
                className="h-9 w-full"
              />
            </FilterField>

            <FilterField label="Order total (€)">
              <div className="flex items-center gap-2">
                <Input
                  value={filters.minTotal}
                  onChange={(event) => onPatch({ minTotal: event.target.value })}
                  placeholder="Min"
                  inputMode="decimal"
                  aria-label="Minimum order total"
                  className="h-9 tabular-nums"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  value={filters.maxTotal}
                  onChange={(event) => onPatch({ maxTotal: event.target.value })}
                  placeholder="Max"
                  inputMode="decimal"
                  aria-label="Maximum order total"
                  className="h-9 tabular-nums"
                />
              </div>
            </FilterField>
          </FilterPopover>

          <ColumnsMenu table={table} />
          <DensityToggle value={density} onChange={onDensityChange} />
        </div>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-2 border-t px-3 py-2",
          selecting && "bg-primary/5",
        )}
      >
        {selecting ? (
          <SelectionBar count={selectionCount} onClear={onClearSelection}>
            {bulkActions}
          </SelectionBar>
        ) : (
          <>
            <ResultsSummary
              count={count}
              noun="order"
              activeFilterCount={activeCount}
              busy={busy}
            />
            <ActiveFilters filters={chips} onClearAll={onReset} activeCount={activeCount} />
          </>
        )}
      </div>
    </div>
  );
}
