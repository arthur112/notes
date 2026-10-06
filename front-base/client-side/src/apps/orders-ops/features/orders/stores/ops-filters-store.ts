import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { DEFAULT_OPS_FILTERS, type OpsFilters } from "../types/ops-orders-filters";

/**
 * The Ops filter state, lifted out of the React tree into a Zustand store.
 *
 * Why: the filters used to be page `useState`, so every search keystroke
 * re-rendered the page, toolbar and table — only the *fetch* was debounced.
 * Now each control subscribes to just its own slice, and the page derives its
 * Gridify conditions from `debouncedQuery` + the non-query slices, so typing
 * re-renders nothing but the search input.
 *
 * The debounce lives in the store itself, not in a hook: `query` updates
 * immediately (it's the input's value), `debouncedQuery` trails it by
 * `DEBOUNCE_MS` and is the only query value query-building code may read.
 * Being plain TypeScript, it works with no component mounted and covers every
 * mutation path (typing, reset, any future writer) uniformly.
 */

const DEBOUNCE_MS = 350;

type OpsFiltersStore = OpsFilters & {
  /** `query` after DEBOUNCE_MS of quiet — the value the Gridify query uses. */
  debouncedQuery: string;
  patch: (patch: Partial<OpsFilters>) => void;
  reset: () => void;
};

export const useOpsFiltersStore = create<OpsFiltersStore>()((set) => ({
  ...DEFAULT_OPS_FILTERS,
  debouncedQuery: DEFAULT_OPS_FILTERS.query,
  patch: (patch) => set(patch),
  // Reset flushes the debounce synchronously: without it, the stale
  // `debouncedQuery` would linger for DEBOUNCE_MS and fire one refetch for
  // "old search text, everything else cleared" before the correct one.
  reset: () => {
    window.clearTimeout(debounceTimer);
    set({ ...DEFAULT_OPS_FILTERS, debouncedQuery: DEFAULT_OPS_FILTERS.query });
  },
}));

// Keep `debouncedQuery` trailing `query`, whichever action changed it. Reading
// the state at fire time (not capture time) means a `reset()` during the
// quiet window can never resurrect a stale query.
let debounceTimer: number | undefined;
useOpsFiltersStore.subscribe((state, prev) => {
  if (state.query === prev.query) return;
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(
    () => useOpsFiltersStore.setState({ debouncedQuery: useOpsFiltersStore.getState().query }),
    DEBOUNCE_MS,
  );
});

/** The whole filter object as one snapshot — for the pure helpers that take `OpsFilters`. */
export const selectFiltersSnapshot = (state: OpsFiltersStore): OpsFilters => ({
  query: state.query,
  statuses: state.statuses,
  channel: state.channel,
  period: state.period,
  minTotal: state.minTotal,
  maxTotal: state.maxTotal,
});

/**
 * The slices the Gridify conditions depend on: every filter *except* the raw
 * `query`, plus its debounced twin. Selecting exactly this set is what keeps
 * search keystrokes from re-rendering the page.
 */
export const selectEffectiveFilters = (state: OpsFiltersStore) =>
  [
    state.debouncedQuery,
    state.statuses,
    state.channel,
    state.period,
    state.minTotal,
    state.maxTotal,
  ] as const;

export function useEffectiveOpsFilters() {
  return useOpsFiltersStore(useShallow(selectEffectiveFilters));
}

/** Rebuild an `OpsFilters` from the effective tuple (query = the debounced one). */
export function effectiveFiltersToOpsFilters([
  debouncedQuery,
  statuses,
  channel,
  period,
  minTotal,
  maxTotal,
]: ReturnType<typeof selectEffectiveFilters>): OpsFilters {
  return { query: debouncedQuery, statuses, channel, period, minTotal, maxTotal };
}
