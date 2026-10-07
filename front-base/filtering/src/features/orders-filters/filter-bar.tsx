import { FilterField } from "@/shared/components/filter-field";
import { Button } from "@/shared/components/ui/button";
import { DateRangePicker } from "@/shared/components/ui/date-picker";
import { NumberRangeInput } from "@/shared/components/ui/number-range-input";
import { SearchInput } from "@/shared/components/ui/search-input";
import { SearchSelect } from "@/shared/components/ui/search-select";

import { STATUS_OPTIONS, type OrdersFilter } from "./filter";

export type FilterBarProps = {
  filter: OrdersFilter;
  onPatch: (patch: Partial<OrdersFilter>) => void;
  onReset: () => void;
};

/**
 * Dumb by construction — every control is controlled by the page's filter
 * object. The controls are the shared `ui/` ones a form would use too; the bar
 * only labels them and sets their widths.
 */
export function FilterBar({ filter, onPatch, onReset }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
      <FilterField label="Search" className="min-w-56 flex-1">
        <SearchInput
          value={filter.query}
          onChange={(query) => onPatch({ query })}
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
          ariaLabel="Status"
        />
      </FilterField>

      <FilterField label="Order total (€)" className="w-56">
        <NumberRangeInput
          value={filter.total}
          onChange={(total) => onPatch({ total })}
          minAriaLabel="Minimum order total"
          maxAriaLabel="Maximum order total"
        />
      </FilterField>

      <FilterField label="Created between" className="w-64">
        <DateRangePicker
          value={filter.createdAt}
          onChange={(createdAt) => onPatch({ createdAt })}
          ariaLabel="Created period"
        />
      </FilterField>

      <Button variant="ghost" size="lg" onClick={onReset}>
        Clear all filters
      </Button>
    </div>
  );
}
