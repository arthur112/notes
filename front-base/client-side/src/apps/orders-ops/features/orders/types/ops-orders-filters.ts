import type { ActiveFilter } from "@/shared/components/filters/active-filters";
import type { Channel, ConditionSpec, OrderStatus } from "@/shared/domain/orders";
import { CHANNELS, CHANNEL_LABELS, STATUS_META } from "@/shared/domain/orders";
import { addDaysYmd, type Ymd } from "@/shared/lib/date";

/**
 * The Ops app's specific filter set — five filters, none of which the Finance
 * app shares. The zod-shaped type, defaults and the pure mapping to Gridify
 * conditions live here so components/pages stay declarative.
 */

export const OPS_CHANNELS: readonly Channel[] = CHANNELS;

export type OpsFilters = {
  /** Free-text search over order number + customer name (debounced). */
  query: string;
  statuses: OrderStatus[];
  channel: Channel | null;
  period: { from: Ymd | null; to: Ymd | null };
  minTotal: string; // raw input; empty string means "no bound"
  maxTotal: string;
};

export const DEFAULT_OPS_FILTERS: OpsFilters = {
  query: "",
  statuses: [],
  channel: null,
  period: { from: null, to: null },
  minTotal: "",
  maxTotal: "",
};

export function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export function isOpsFiltersDefault(filters: OpsFilters): boolean {
  return (
    filters.query.trim() === "" &&
    filters.statuses.length === 0 &&
    filters.channel === null &&
    filters.period.from === null &&
    filters.period.to === null &&
    parseAmount(filters.minTotal) === null &&
    parseAmount(filters.maxTotal) === null
  );
}

function hasPeriod(filters: OpsFilters): boolean {
  return filters.period.from !== null || filters.period.to !== null;
}

/**
 * How many filters live behind the `Filters (n)` popover: channel + period +
 * the two amount bounds. Search and status have their own always-visible
 * controls, so they are deliberately **not** counted here.
 */
export function countOpsPopoverFilters(filters: OpsFilters): number {
  let count = 0;
  if (filters.channel !== null) count += 1;
  if (hasPeriod(filters)) count += 1;
  if (parseAmount(filters.minTotal) !== null) count += 1;
  if (parseAmount(filters.maxTotal) !== null) count += 1;
  return count;
}

/** Every narrowing filter, for the results line ("312 orders · 3 filters"). */
export function countOpsActiveFilters(filters: OpsFilters): number {
  let count = countOpsPopoverFilters(filters) + filters.statuses.length;
  if (filters.query.trim() !== "") count += 1;
  return count;
}

export type OpsFilterChip = ActiveFilter;

/**
 * Chips are the **single source of truth for what is tucked away**: they exist
 * only for filters with no visible control (channel, period, amount). Status
 * pills and the search box already show their own value, so duplicating them as
 * chips is noise. Labels always use display names, never raw enum values.
 */
export function opsPopoverChips(
  filters: OpsFilters,
  patch: (next: Partial<OpsFilters>) => void,
): OpsFilterChip[] {
  const chips: OpsFilterChip[] = [];
  const min = parseAmount(filters.minTotal);
  const max = parseAmount(filters.maxTotal);
  const { from, to } = filters.period;

  if (filters.channel) {
    chips.push({
      key: "channel",
      label: `Channel: ${CHANNEL_LABELS[filters.channel]}`,
      onClear: () => patch({ channel: null }),
    });
  }
  if (from && to) {
    chips.push({
      key: "period",
      label: `Created: ${from} → ${to}`,
      onClear: () => patch({ period: { from: null, to: null } }),
    });
  } else if (from) {
    chips.push({
      key: "period",
      label: `Created: from ${from}`,
      onClear: () => patch({ period: { from: null, to: null } }),
    });
  } else if (to) {
    chips.push({
      key: "period",
      label: `Created: until ${to}`,
      onClear: () => patch({ period: { from: null, to: null } }),
    });
  }
  if (min !== null) {
    chips.push({
      key: "min",
      label: `Total ≥ ${min}`,
      onClear: () => patch({ minTotal: "" }),
    });
  }
  if (max !== null) {
    chips.push({
      key: "max",
      label: `Total ≤ ${max}`,
      onClear: () => patch({ maxTotal: "" }),
    });
  }
  return chips;
}

/** Readable status summary for the results line when statuses are narrowed. */
export function describeOpsStatuses(filters: OpsFilters): string | null {
  if (filters.statuses.length === 0) return null;
  return filters.statuses.map((status) => STATUS_META[status].label).join(", ");
}

/**
 * Map the Ops filters to Gridify conditions. The text query is debounced
 * upstream and injected here so a keystroke doesn't refire the request.
 */
export function toOpsConditions(filters: OpsFilters, query: string): ConditionSpec[][] {
  const groups: ConditionSpec[][] = [];
  const q = query.trim();
  const min = parseAmount(filters.minTotal);
  const max = parseAmount(filters.maxTotal);

  if (q) {
    groups.push([
      { field: "orderNo", op: "contains", value: q },
      { field: "customer.name", op: "contains", value: q },
    ]);
  }
  if (filters.statuses.length > 0) {
    groups.push(filters.statuses.map((s) => ({ field: "status", op: "eq", value: s })));
  }
  if (filters.channel) {
    groups.push([{ field: "channel", op: "eq", value: filters.channel }]);
  }
  if (filters.period.from) {
    groups.push([{ field: "createdAt", op: "gte", value: filters.period.from }]);
  }
  if (filters.period.to) {
    // inclusive `to` → exclusive next-day upper bound
    groups.push([{ field: "createdAt", op: "lt", value: addDaysYmd(filters.period.to, 1) }]);
  }
  if (min !== null) groups.push([{ field: "total", op: "gte", value: min }]);
  if (max !== null) groups.push([{ field: "total", op: "lte", value: max }]);

  return groups;
}
