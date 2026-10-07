import { FilterField } from "@/shared/components/filter-field";
import { Button } from "@/shared/components/ui/button";
import { DateRangePicker } from "@/shared/components/ui/date-picker";
import { NumberRangeInput } from "@/shared/components/ui/number-range-input";
import { SearchInput } from "@/shared/components/ui/search-input";
import { SearchSelect } from "@/shared/components/ui/search-select";
import { useBufferedValue } from "@/shared/hooks/use-buffered-value";

import { STATUS_OPTIONS, type OrdersFilter } from "./filter";

export type FilterBarProps = {
  /** The settled filter. */
  filter: OrdersFilter;
  onPatch: (patch: Partial<OrdersFilter>) => void;
  onReset: () => void;
};

/**
 * Controlled by the page's settled filter. Picks (status, dates) are patched at
 * once; typed fields (search, totals) keep a draft while edited and are
 * patched once typing pauses or the field loses focus.
 */
export function FilterBar({ filter, onPatch, onReset }: FilterBarProps) {
  const query = useBufferedValue(filter.query, (query) => onPatch({ query }));
  const total = useBufferedValue(filter.total, (total) => onPatch({ total }));

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
      <FilterField label="Search" className="min-w-56 flex-1">
        <SearchInput
          {...query}
          placeholder="Order no or customer…"
          aria-label="Search orders by number or customer"
        />
      </FilterField>

      <FilterField label="Status" className="w-44">
        <SearchSelect
          options={STATUS_OPTIONS}
          value={filter.status}
          onChange={(status) => onPatch({ status })}
          placeholder="Any status"
          aria-label="Status"
        />
      </FilterField>

      <FilterField label="Order total (€)" className="w-56">
        <NumberRangeInput
          {...total}
          minAriaLabel="Minimum order total"
          maxAriaLabel="Maximum order total"
        />
      </FilterField>

      <FilterField label="Created between" className="w-64">
        <DateRangePicker
          value={filter.createdAt}
          onChange={(createdAt) => onPatch({ createdAt })}
          aria-label="Created period"
        />
      </FilterField>

      <Button variant="ghost" size="lg" onClick={onReset}>
        Clear all filters
      </Button>
    </div>
  );
}
