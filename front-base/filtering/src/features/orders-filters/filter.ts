import type { SearchSchemaInput } from "@tanstack/react-router";

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

/**
 * What the URL or a patch may hold for each key: the typed value, the raw text
 * a control holds (`" acme "`, `"10,5"`), or `null` for "cleared".
 * `validateOrdersSearch` parses it, so controls patch their values as they are.
 */
export type OrdersSearchInput = { [K in keyof OrdersSearch]?: OrdersSearch[K] | string | null };

/** Raw text (`" 10,5 "`) or a number → an amount; empty or unparsable → no bound. */
function parseAmount(raw: unknown): number | undefined {
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
 * The route's `validateSearch`, and the one place that parses the filter. The
 * router runs it on the URL (every value a string) and on the search each
 * navigation builds, so patches may hold raw values: text is trimmed, amounts
 * parsed, `null` dropped. It is lenient: an invalid value (`status=bogus`,
 * `min=abc`, `from=nope`) is dropped, never a route error. The
 * `SearchSchemaInput` tag makes `OrdersSearchInput` the type `navigate`
 * accepts; without it the router would expect the validated type.
 */
export function validateOrdersSearch(raw: OrdersSearchInput & SearchSchemaInput): OrdersSearch {
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
