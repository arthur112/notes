import { useCallback, useMemo, useState } from "react";

import { useDebouncedValue } from "@/shared/hooks/use-debounce";
import { buildFilter } from "@/shared/lib/gridify";

import { FilterBar } from "./filter-bar";
import { DEFAULT_ORDERS_FILTER, toConditions, type OrdersFilter } from "./filter";

/**
 * Smart page: owns the filter object in component state and derives the
 * Gridify filter string from a **debounced** copy of it — the controls stay
 * instant, the query only rebuilds once input settles. No data fetching —
 * the generated string is the output.
 */
export function FiltersPage() {
  const [filter, setFilter] = useState<OrdersFilter>(DEFAULT_ORDERS_FILTER);
  const debouncedFilter = useDebouncedValue(filter, 350);

  const patchFilter = useCallback((patch: Partial<OrdersFilter>) => {
    setFilter((current) => ({ ...current, ...patch }));
  }, []);

  const resetFilter = useCallback(() => setFilter(DEFAULT_ORDERS_FILTER), []);

  const conditions = useMemo(() => toConditions(debouncedFilter), [debouncedFilter]);
  const gridifyFilter = useMemo(() => buildFilter(conditions), [conditions]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">Filtering</h1>
        <p className="text-sm text-muted-foreground">
          A filter object in page state → Gridify conditions → Gridify filter string.
        </p>
      </header>

      <FilterBar filter={filter} onPatch={patchFilter} onReset={resetFilter} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Gridify filter</h2>
        <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm">
          {gridifyFilter || "(no filter)"}
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Filter object</h2>
        <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs">
          {JSON.stringify(filter, null, 2)}
        </pre>
      </section>
    </div>
  );
}
