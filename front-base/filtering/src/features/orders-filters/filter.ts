import type { SearchSelectOption } from "@/shared/components/ui/search-select";
import { addDaysYmd, type Ymd } from "@/shared/lib/date";
import { buildFilter, type ConditionSpec } from "@/shared/lib/gridify";

/**
 * The filter is the URL search: its type, its validation and the pure mapping
 * to Gridify live here, so the components stay declarative: change a field
 * here, and the bar + query follow.
 */

export const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof STATUSES)[number];

export const STATUS_OPTIONS: SearchSelectOption<OrderStatus>[] = STATUSES.map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));

/** The settled filter as flat URL keys; absent key = no constraint. */
export type OrdersSearch = {
  /** Free-text search over order number + customer name. */
  q?: string;
  status?: OrderStatus;
  /** Order total bounds. */
  min?: number;
  max?: number;
  /** Creation bounds — inclusive UTC `YYYY-MM-DD`. */
  from?: Ymd;
  to?: Ymd;
};

/** Raw text (`" 10,5 "`) or a number → an amount; empty or unparsable → no bound. */
export function parseAmount(raw: unknown): number | undefined {
  const value = typeof raw === "string" && raw.trim() ? Number(raw.replace(",", ".")) : raw;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * The Gridify `filter` string for a settled search — what the orders query
 * sends. The search is already normalized by `validateOrdersSearch`.
 */
export function toGridifyFilter({ q, status, min, max, from, to }: OrdersSearch): string {
  const groups: ConditionSpec[][] = [];
  if (q) {
    groups.push([
      { field: "orderNo", op: "contains", value: q },
      { field: "customer.name", op: "contains", value: q },
    ]);
  }
  if (status) groups.push([{ field: "status", op: "eq", value: status }]);
  if (min !== undefined) groups.push([{ field: "total", op: "gte", value: min }]);
  if (max !== undefined) groups.push([{ field: "total", op: "lte", value: max }]);
  if (from) groups.push([{ field: "createdAt", op: "gte", value: from }]);
  // inclusive `to` → exclusive next-day upper bound
  if (to) groups.push([{ field: "createdAt", op: "lt", value: addDaysYmd(to, 1) }]);
  return buildFilter(groups);
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function ymd(value: unknown): Ymd | undefined {
  return typeof value === "string" && YMD.test(value) ? value : undefined;
}

function isStatus(value: unknown): value is OrderStatus {
  return STATUSES.includes(value as OrderStatus);
}

/**
 * The route's `validateSearch`. The router runs it on the URL (every value a
 * string) and on the search each navigation builds, so patches may hold raw
 * text: it is trimmed and parsed here. It is lenient: an invalid value
 * (`status=bogus`, `min=abc`, `from=nope`) is dropped, never a route error.
 */
export function validateOrdersSearch(raw: Record<string, unknown>): OrdersSearch {
  const q = typeof raw.q === "string" ? raw.q.trim() : "";
  return {
    q: q || undefined,
    status: isStatus(raw.status) ? raw.status : undefined,
    min: parseAmount(raw.min),
    max: parseAmount(raw.max),
    from: ymd(raw.from),
    to: ymd(raw.to),
  };
}
