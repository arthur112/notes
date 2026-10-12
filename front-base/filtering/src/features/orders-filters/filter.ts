import { z } from "zod";

import type { SearchSelectOption } from "@/shared/components/ui/search-select";
import { addDaysYmd } from "@/shared/lib/date";
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

/**
 * A lenient search key: an invalid value (`status=bogus`, `min=abc`,
 * `from=nope`) means "no constraint", never a route error.
 */
const lenient = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

/** Raw text (`" 10,5 "`) or a number → an amount; empty or unparsable fails. */
const amount = z
  .union([
    z.number(),
    z
      .string()
      .trim()
      .min(1)
      .transform((raw) => Number(raw.replace(",", "."))),
  ])
  .pipe(z.number());

/**
 * The route's `validateSearch`, and the one place that parses the filter. The
 * router runs it on the URL (every value a string) and on the search each
 * navigation builds, so patches may hold the raw text a control holds
 * (`" acme "`, `"10,5"`): text is trimmed, amounts parsed. The router takes it as a Standard Schema (no adapter): its input
 * type is what `navigate` accepts, its output the typed search.
 */
export const ordersSearchSchema = z.object({
  /** Free-text search over order number + customer name. */
  q: lenient(z.string().trim().min(1)),
  status: lenient(z.enum(STATUSES)),
  /** Order total bounds. */
  min: lenient(amount),
  max: lenient(amount),
  /** Creation bounds — inclusive UTC `YYYY-MM-DD`. */
  from: lenient(z.iso.date()),
  to: lenient(z.iso.date()),
});

/** The settled filter as flat URL keys; `undefined` = no constraint. */
export type OrdersSearch = z.output<typeof ordersSearchSchema>;
/** What a patch may hold: the typed value, a control's raw text, or `undefined` for "cleared". */
export type OrdersSearchInput = z.input<typeof ordersSearchSchema>;

/**
 * The Gridify `filter` string for a settled search — what the orders query
 * sends. The search is already normalized by `ordersSearchSchema`.
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
