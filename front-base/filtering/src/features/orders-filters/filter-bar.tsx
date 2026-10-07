import { Search } from "lucide-react";

import { FilterField } from "@/shared/components/filter-field";
import { Button } from "@/shared/components/ui/button";
import { DateRangePicker } from "@/shared/components/ui/date-picker";
import { Input } from "@/shared/components/ui/input";
import { SearchSelect } from "@/shared/components/ui/search-select";

import { STATUS_OPTIONS, type OrderStatus, type OrdersFilter } from "./filter";

export type FilterBarProps = {
  filter: OrdersFilter;
  onPatch: (patch: Partial<OrdersFilter>) => void;
  onReset: () => void;
};

/** Dumb by construction — every control is controlled by the page's filter object. */
export function FilterBar({ filter, onPatch, onReset }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
      <FilterField label="Search" className="min-w-56 flex-1">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter.query}
            onChange={(event) => onPatch({ query: event.target.value })}
            placeholder="Order no or customer…"
            className="h-9 pl-9"
            aria-label="Search orders by number or customer"
          />
        </div>
      </FilterField>

      <FilterField label="Status">
        <SearchSelect
          options={STATUS_OPTIONS}
          value={filter.status}
          onChange={(next) => onPatch({ status: next as OrderStatus | null })}
          placeholder="Any status"
          ariaLabel="Status"
          className="h-9 w-44"
        />
      </FilterField>

      <FilterField label="Order total (€)">
        <div className="flex items-center gap-2">
          <Input
            value={filter.minTotal}
            onChange={(event) => onPatch({ minTotal: event.target.value })}
            placeholder="Min"
            inputMode="decimal"
            aria-label="Minimum order total"
            className="h-9 w-24 tabular-nums"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            value={filter.maxTotal}
            onChange={(event) => onPatch({ maxTotal: event.target.value })}
            placeholder="Max"
            inputMode="decimal"
            aria-label="Maximum order total"
            className="h-9 w-24 tabular-nums"
          />
        </div>
      </FilterField>

      <FilterField label="Created between">
        <DateRangePicker
          value={filter.createdAt}
          onChange={(createdAt) => onPatch({ createdAt })}
          ariaLabel="Created period"
          className="h-9 w-64"
        />
      </FilterField>

      <Button variant="ghost" onClick={onReset}>
        Clear all filters
      </Button>
    </div>
  );
}
