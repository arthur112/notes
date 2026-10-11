import { FilterField } from "@/shared/components/filter-field";
import { Button } from "@/shared/components/ui/button";
import { DateRangePicker } from "@/shared/components/ui/date-picker";
import { NumberRangeInput } from "@/shared/components/ui/number-range-input";
import { SearchInput } from "@/shared/components/ui/search-input";
import { SearchSelect } from "@/shared/components/ui/search-select";
import { useBufferedValue } from "@/shared/hooks/use-buffered-value";

import { STATUS_OPTIONS, type OrdersSearch, type OrdersSearchInput } from "./filter";

export type FilterBarProps = {
  /** The settled filter, from the URL. */
  search: OrdersSearch;
  /** Raw control values; the route's `validateSearch` parses them. */
  onPatch: (changes: OrdersSearchInput) => void;
  onReset: () => void;
};

/**
 * Controlled by the page's settled filter. Picks (status, dates) are patched at
 * once; typed fields (search, totals) keep a draft while edited and are
 * patched once typing pauses or the field loses focus.
 */
export function FilterBar({ search, onPatch, onReset }: FilterBarProps) {
  const query = useBufferedValue(search.q ?? "", (q) => onPatch({ q }));
  // The range's `{ min, max }` and the dates' `{ from, to }` are named like
  // their search keys, so they are patched as they are.
  const total = useBufferedValue(
    { min: String(search.min ?? ""), max: String(search.max ?? "") },
    onPatch,
  );

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
          value={search.status ?? null}
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
          value={{ from: search.from ?? null, to: search.to ?? null }}
          onChange={onPatch}
          aria-label="Created period"
        />
      </FilterField>

      <Button variant="ghost" size="lg" onClick={onReset}>
        Clear all filters
      </Button>
    </div>
  );
}
