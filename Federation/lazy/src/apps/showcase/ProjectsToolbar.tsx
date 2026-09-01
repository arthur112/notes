import { SearchBar } from "./SearchBar";
import { FilterBadges } from "./FilterBadges";
import type { ShowcaseState } from "./data";

/**
 * The shared scaffolding under the stats of every design: "Projects" count
 * line, search bar, and active-filter chips. Identical across designs so the
 * comparison isolates the visual language of stats + list.
 */
export function ProjectsToolbar({ state }: { state: ShowcaseState }) {
  return (
    <>
      <div className="mt-6 flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium">Projects</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {state.filtered.length} of {state.total}
        </span>
      </div>

      <div className="mt-3">
        <SearchBar
          query={state.query}
          onQueryChange={state.onQueryChange}
          month={state.month}
          onMonthChange={state.onMonthChange}
          statuses={state.statuses}
          onStatusesChange={state.onStatusesChange}
          statusOptions={state.statusOptions}
        />
      </div>

      <FilterBadges
        month={state.month}
        onMonthChange={state.onMonthChange}
        statuses={state.statuses}
        onStatusesChange={state.onStatusesChange}
        statusOptions={state.statusOptions}
      />
    </>
  );
}
