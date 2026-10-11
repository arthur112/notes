import { ListFilter } from "lucide-react";

import { FilterField } from "@/shared/components/filter-field";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { DateRangePicker } from "@/shared/components/ui/date-picker";
import { NumberRangeInput } from "@/shared/components/ui/number-range-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { SearchInput } from "@/shared/components/ui/search-input";
import { SearchSelect } from "@/shared/components/ui/search-select";
import { useBufferedValue } from "@/shared/hooks/use-buffered-value";

import { STATUS_OPTIONS, type OrdersSearch, type OrdersSearchInput } from "./filter";

export type FilterBarProps = {
  /** The settled filter, from the URL. */
  search: OrdersSearch;
  /** Raw control values; the route's `validateSearch` parses them. */
  onPatch: (changes: OrdersSearchInput) => void;
};

/**
 * A search bar plus a "Filters" popover holding the other fields. Controlled by
 * the page's settled filter. Picks (status, dates) are patched at once; typed
 * fields (search, totals) keep a draft while edited and are patched once typing
 * pauses or the field loses focus.
 */
export function FilterBar({ search, onPatch }: FilterBarProps) {
  const query = useBufferedValue(search.q ?? "", (q) => onPatch({ q }));
  // The range's `{ min, max }` and the dates' `{ from, to }` are named like
  // their search keys, so they are patched as they are.
  const total = useBufferedValue(
    { min: String(search.min ?? ""), max: String(search.max ?? "") },
    onPatch,
  );

  // The popover's filters; the trigger counts the set ones.
  const activeCount = [search.status, search.min ?? search.max, search.from ?? search.to].filter(
    (value) => value !== undefined,
  ).length;

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <SearchInput
          {...query}
          placeholder="Order no or customer…"
          aria-label="Search orders by number or customer"
        />
      </div>

      <Popover>
        <PopoverTrigger className={buttonVariants({ variant: "outline", size: "lg" })}>
          <ListFilter />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
              {activeCount}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 space-y-4">
          <FilterField label="Status">
            <SearchSelect
              options={STATUS_OPTIONS}
              value={search.status ?? null}
              onChange={(status) => onPatch({ status })}
              placeholder="Any status"
              aria-label="Status"
            />
          </FilterField>

          <FilterField label="Order total (€)">
            <NumberRangeInput
              {...total}
              minAriaLabel="Minimum order total"
              maxAriaLabel="Maximum order total"
            />
          </FilterField>

          <FilterField label="Created between">
            <DateRangePicker
              value={{ from: search.from ?? null, to: search.to ?? null }}
              onChange={onPatch}
              aria-label="Created period"
            />
          </FilterField>

          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            disabled={activeCount === 0}
            onClick={() => onPatch({ status: null, min: null, max: null, from: null, to: null })}
          >
            Clear filters
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
