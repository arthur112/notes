import type { ReactNode } from "react";
import type { ReactTable } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

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
  selectFiltersSnapshot,
  useOpsFiltersStore,
} from "../stores/ops-filters-store";
import {
  countOpsActiveFilters,
  countOpsPopoverFilters,
  opsPopoverChips,
} from "../types/ops-orders-filters";

export type OpsToolbarProps = {
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
 * The always-visible search box. Subscribes to only the raw `query` slice, so
 * a keystroke re-renders this input and nothing else — the debounced twin in
 * the store is what eventually re-fires the Gridify query.
 */
function OpsSearchInput() {
  const query = useOpsFiltersStore((state) => state.query);
  const patch = useOpsFiltersStore((state) => state.patch);
  return (
    <div className="relative min-w-56 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => patch({ query: event.target.value })}
        placeholder="Search order no or customer…"
        className="h-9 pl-9"
        aria-label="Search orders by number or customer"
      />
    </div>
  );
}

function OpsStatusPills() {
  const statuses = useOpsFiltersStore((state) => state.statuses);
  const patch = useOpsFiltersStore((state) => state.patch);
  return (
    <StatusPills
      value={statuses}
      onChange={(next) => patch({ statuses: next as OrderStatus[] })}
    />
  );
}

/** The labelled `Filters (n)` popover: channel, period and the amount bounds. */
function OpsFilterPopover({ channelOptions }: { channelOptions: MultiSelectOption[] }) {
  const channel = useOpsFiltersStore((state) => state.channel);
  const period = useOpsFiltersStore((state) => state.period);
  const minTotal = useOpsFiltersStore((state) => state.minTotal);
  const maxTotal = useOpsFiltersStore((state) => state.maxTotal);
  const patch = useOpsFiltersStore((state) => state.patch);
  const reset = useOpsFiltersStore((state) => state.reset);

  const popoverCount = countOpsPopoverFilters({
    query: "",
    statuses: [],
    channel,
    period,
    minTotal,
    maxTotal,
  });

  return (
    <FilterPopover activeCount={popoverCount} onClear={reset}>
      <FilterField label="Channel">
        <SearchSelect
          options={channelOptions}
          value={channel}
          onChange={(next) => patch({ channel: next as Channel | null })}
          placeholder="Any channel"
          ariaLabel="Channel"
          className="h-9 w-full"
        />
      </FilterField>

      <FilterField label="Created between">
        <DateRangePicker
          value={period}
          onChange={(next) => patch({ period: next })}
          ariaLabel="Created period"
          className="h-9 w-full"
        />
      </FilterField>

      <FilterField label="Order total (€)">
        <div className="flex items-center gap-2">
          <Input
            value={minTotal}
            onChange={(event) => patch({ minTotal: event.target.value })}
            placeholder="Min"
            inputMode="decimal"
            aria-label="Minimum order total"
            className="h-9 tabular-nums"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            value={maxTotal}
            onChange={(event) => patch({ maxTotal: event.target.value })}
            placeholder="Max"
            inputMode="decimal"
            aria-label="Maximum order total"
            className="h-9 tabular-nums"
          />
        </div>
      </FilterField>
    </FilterPopover>
  );
}

/**
 * The scope line: result count + chips for the tucked-away filters. This is
 * the one control that reads the *whole* filter snapshot (the active count
 * includes the raw query), so it re-renders on keystrokes — cheap, it is a
 * single line of text.
 */
function OpsResultsRow({ count, busy }: { count: number; busy: boolean }) {
  const filters = useOpsFiltersStore(useShallow(selectFiltersSnapshot));
  const patch = useOpsFiltersStore((state) => state.patch);
  const reset = useOpsFiltersStore((state) => state.reset);

  const activeCount = countOpsActiveFilters(filters);
  const chips = opsPopoverChips(filters, patch);

  return (
    <>
      <ResultsSummary count={count} noun="order" activeFilterCount={activeCount} busy={busy} />
      <ActiveFilters filters={chips} onClearAll={reset} activeCount={activeCount} />
    </>
  );
}

/**
 * The Ops control surface: one always-visible search + status row, everything
 * else behind a single labelled `Filters (n)` popover, and a scope line that
 * states the result count and only the filters that have no control of their
 * own. Filter controls are connected — each subscribes to its own slice of
 * the ops-filters store — while table/server concerns stay prop-driven.
 */
export function OpsToolbar({
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
  const selecting = selectionCount > 0;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <OpsSearchInput />
        <OpsStatusPills />

        <div className="flex items-center gap-2 sm:ml-auto">
          <OpsFilterPopover channelOptions={channelOptions} />
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
          <OpsResultsRow count={count} busy={busy} />
        )}
      </div>
    </div>
  );
}
