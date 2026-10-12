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

export const CUSTOMER_OPTIONS: SearchSelectOption[] = [
  "Acme Corp",
  "Globex",
  "Hooli",
  "Initech",
  "Umbrella",
].map((name) => ({ value: name, label: name }));

/**
 * A lenient search key: an invalid value (`status=bogus`, `min=abc`,
 * `created={"from":"nope"}`) means "no constraint", never a route error.
 */
const lenient = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

/**
 * Text or a number, as text: the router JSON-parses each URL value, so a
 * hand-typed `?q=123` arrives as a number. The type argument keeps the input
 * type (what `navigate` accepts) from widening to `unknown`.
 */
const text = z.coerce.string<string | number>().trim().min(1);

/** Raw text (`" 10,5 "`) or a number → an amount; empty or unparsable fails. */
const amount = text.transform((raw) => Number(raw.replace(",", "."))).pipe(z.number());

/**
 * The route's `validateSearch`, and the one place that parses the filter. The
 * router runs it on the URL (each value JSON-parsed: `10.5` is a number,
 * `["Globex"]` an array, `{"from":…}` an object, `acme` stays a string) and on the search each
 * navigation builds, so patches may hold the raw text a control holds
 * (`" acme "`, `"10,5"`): text is trimmed, amounts parsed. The router takes it
 * as a Standard Schema (no adapter): its input type is what `navigate` accepts,
 * its output the typed search.
 */
export const ordersSearchSchema = z.object({
  /** Free-text search over order number + customer name. */
  q: lenient(text),
  status: lenient(z.enum(STATUSES)),
  /** Any of these customers; an empty pick means no constraint. */
  customers: lenient(z.array(z.string()).min(1)),
  /** Order total bounds. */
  min: lenient(amount),
  max: lenient(amount),
  /** Creation bounds — inclusive UTC `YYYY-MM-DD`; with neither set, no key. */
  created: lenient(
    z
      .object({ from: z.iso.date().optional(), to: z.iso.date().optional() })
      .refine(({ from, to }) => from ?? to),
  ),
});

/** The settled filter as URL keys; `undefined` = no constraint. */
export type OrdersSearch = z.output<typeof ordersSearchSchema>;
/** What a patch may hold: the typed value, a control's raw text, or `undefined` for "cleared". */
export type OrdersSearchInput = z.input<typeof ordersSearchSchema>;

/**
 * The Gridify `filter` string for a settled search — what the orders query
 * sends. The search is already normalized by `ordersSearchSchema`.
 */
export function toGridifyFilter({ q, status, customers, min, max, created }: OrdersSearch): string {
  const groups: ConditionSpec[][] = [];
  if (q) {
    groups.push([
      { field: "orderNo", op: "contains", value: q },
      { field: "customer.name", op: "contains", value: q },
    ]);
  }
  if (status) groups.push([{ field: "status", op: "eq", value: status }]);
  if (customers) {
    groups.push(customers.map((name) => ({ field: "customer.name", op: "eq", value: name })));
  }
  if (min !== undefined) groups.push([{ field: "total", op: "gte", value: min }]);
  if (max !== undefined) groups.push([{ field: "total", op: "lte", value: max }]);
  if (created?.from) groups.push([{ field: "createdAt", op: "gte", value: created.from }]);
  // inclusive `to` → exclusive next-day upper bound
  if (created?.to) {
    groups.push([{ field: "createdAt", op: "lt", value: addDaysYmd(created.to, 1) }]);
  }
  return buildFilter(groups);
}
