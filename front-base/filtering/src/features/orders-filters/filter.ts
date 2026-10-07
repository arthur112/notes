import type { DateRange } from "@/shared/components/ui/date-picker";
import type { NumberRange } from "@/shared/components/ui/number-range-input";
import type { SearchSelectOption } from "@/shared/components/ui/search-select";
import { addDaysYmd } from "@/shared/lib/date";
import type { ConditionSpec } from "@/shared/lib/gridify";

/**
 * The filter object the page holds in `useState`. Its shape, defaults and the
 * pure mapping to Gridify conditions live here so the components stay
 * declarative: change a field here, and the bar + query follow.
 */

export const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof STATUSES)[number];

export const STATUS_OPTIONS: SearchSelectOption<OrderStatus>[] = STATUSES.map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));

export type OrdersFilter = {
  /** Free-text search over order number + customer name. */
  query: string;
  /** Dropdown. */
  status: OrderStatus | null;
  /** Number range — raw text; an empty string means "no bound". */
  total: NumberRange;
  /** Calendar — inclusive UTC `YYYY-MM-DD` bounds. */
  createdAt: DateRange;
};

export const DEFAULT_ORDERS_FILTER: OrdersFilter = {
  query: "",
  status: null,
  total: { min: "", max: "" },
  createdAt: { from: null, to: null },
};

export function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export function isOrdersFilterDefault(filter: OrdersFilter): boolean {
  return (
    filter.query.trim() === "" &&
    filter.status === null &&
    parseAmount(filter.total.min) === null &&
    parseAmount(filter.total.max) === null &&
    filter.createdAt.from === null &&
    filter.createdAt.to === null
  );
}

/**
 * Map the filter to Gridify conditions. Pure — the page passes the debounced
 * filter so a keystroke doesn't rebuild the query.
 */
export function toConditions(filter: OrdersFilter): ConditionSpec[][] {
  const groups: ConditionSpec[][] = [];
  const q = filter.query.trim();
  const min = parseAmount(filter.total.min);
  const max = parseAmount(filter.total.max);
  const { from, to } = filter.createdAt;

  if (q) {
    groups.push([
      { field: "orderNo", op: "contains", value: q },
      { field: "customer.name", op: "contains", value: q },
    ]);
  }
  if (filter.status) groups.push([{ field: "status", op: "eq", value: filter.status }]);
  if (min !== null) groups.push([{ field: "total", op: "gte", value: min }]);
  if (max !== null) groups.push([{ field: "total", op: "lte", value: max }]);
  if (from) groups.push([{ field: "createdAt", op: "gte", value: from }]);
  // inclusive `to` → exclusive next-day upper bound
  if (to) groups.push([{ field: "createdAt", op: "lt", value: addDaysYmd(to, 1) }]);

  return groups;
}
