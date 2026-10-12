import { useQuery } from "@tanstack/react-query";
import { ListFilter } from "lucide-react";

import { FilterField } from "@/shared/components/filter-field";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { DateRangePicker } from "@/shared/components/ui/date-picker";
import { NumberRangeInput, type NumberRange } from "@/shared/components/ui/number-range-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { SearchInput } from "@/shared/components/ui/search-input";
import { SearchMultiSelect, SearchSelect } from "@/shared/components/ui/search-select";
import { useBufferedValue } from "@/shared/hooks/use-buffered-value";

import { customersQueryOptions } from "./api/use-orders";
import { STATUS_OPTIONS, type OrdersSearch, type OrdersSearchInput } from "./filter";

export type FilterBarProps = {
  /** The settled filter, from the URL. */
  search: OrdersSearch;
  /** Raw control values; the route's `validateSearch` parses them. */
  onPatch: (changes: OrdersSearchInput) => void;
};

/**
 * A search bar plus a "Filters" popover holding the other fields. Controlled by
 * the page's settled filter. Picks (status, customers, dates) are patched at once; typed
 * fields (search, totals) keep a draft while edited and are patched once typing
 * pauses or the field loses focus.
 */
export function FilterBar({ search, onPatch }: FilterBarProps) {
  // The popover's filters; the trigger counts the set ones.
  const activeCount = [
    search.status,
    search.customers,
    search.min ?? search.max,
    search.created,
  ].filter((value) => value !== undefined).length;

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <QueryField value={search.q ?? ""} onPatch={onPatch} />
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
              onChange={(status) => onPatch({ status: status ?? undefined })}
              placeholder="Any status"
              aria-label="Status"
            />
          </FilterField>

          <FilterField label="Customers">
            <CustomersField value={search.customers ?? []} onPatch={onPatch} />
          </FilterField>

          <FilterField label="Order total (€)">
            <TotalField
              value={{ min: String(search.min ?? ""), max: String(search.max ?? "") }}
              onPatch={onPatch}
            />
          </FilterField>

          <FilterField label="Created between">
            <DateRangePicker
              value={{ from: search.created?.from ?? null, to: search.created?.to ?? null }}
              onChange={({ from, to }) =>
                onPatch({ created: { from: from ?? undefined, to: to ?? undefined } })
              }
              aria-label="Created period"
            />
          </FilterField>

          <Button
            variant="ghost"
            size="lg"
            className="w-full"
            disabled={activeCount === 0}
            onClick={() =>
              onPatch({
                status: undefined,
                customers: undefined,
                min: undefined,
                max: undefined,
                created: undefined,
              })
            }
          >
            Clear filters
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Each typed field owns its draft, so a keystroke re-renders that field only,
// not the whole bar. The page re-renders once per patch, not per keystroke.

function QueryField({ value, onPatch }: { value: string; onPatch: FilterBarProps["onPatch"] }) {
  const query = useBufferedValue(value, (q) => onPatch({ q }));
  return (
    <SearchInput
      {...query}
      placeholder="Order no or customer…"
      aria-label="Search orders by number or customer"
    />
  );
}

function TotalField({
  value,
  onPatch,
}: {
  value: NumberRange;
  onPatch: FilterBarProps["onPatch"];
}) {
  // `{ min, max }` is named like its search keys, so it is patched as it is.
  const total = useBufferedValue(value, onPatch);
  return (
    <NumberRangeInput
      {...total}
      minAriaLabel="Minimum order total"
      maxAriaLabel="Maximum order total"
    />
  );
}

/** Loads its options from the API; mounted with the popover, so the first open fetches them. */
function CustomersField({
  value,
  onPatch,
}: {
  value: string[];
  onPatch: FilterBarProps["onPatch"];
}) {
  const { data = [], isPending, isError } = useQuery(customersQueryOptions());
  return (
    <SearchMultiSelect
      options={data}
      value={value}
      onChange={(customers) => onPatch({ customers })}
      placeholder={isPending ? "Loading…" : "Any customer"}
      emptyMessage={isPending ? "Loading…" : isError ? "Could not load customers." : undefined}
      aria-label="Customers"
    />
  );
}
