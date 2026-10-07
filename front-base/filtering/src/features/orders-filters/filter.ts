import type { DateRange } from "@/shared/components/ui/date-picker";
import type { NumberRange } from "@/shared/components/ui/number-range-input";
import type { SearchSelectOption } from "@/shared/components/ui/search-select";
import { addDaysYmd, type Ymd } from "@/shared/lib/date";
import { buildFilter, type ConditionSpec } from "@/shared/lib/gridify";

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

/** The Gridify `filter` string for a filter object — what the loader and the page fetch with. */
export function toGridifyFilter(filter: OrdersFilter): string {
  return buildFilter(toConditions(filter));
}

// ---------------------------------------------------------------------------
// URL search params: the settled (debounced) filter lives in the URL, so the
// route loader can fetch it and a link/reload/Back restores it.
// ---------------------------------------------------------------------------

/** The settled filter as flat URL keys; absent key = no constraint. */
export type OrdersSearch = {
  q?: string;
  status?: OrderStatus;
  min?: number;
  max?: number;
  from?: Ymd;
  to?: Ymd;
};

/** Filter → URL search; empty and unparsable values are left out. */
export function filterToSearch(filter: OrdersFilter): OrdersSearch {
  const q = filter.query.trim();
  const min = parseAmount(filter.total.min);
  const max = parseAmount(filter.total.max);
  return {
    q: q || undefined,
    status: filter.status ?? undefined,
    min: min ?? undefined,
    max: max ?? undefined,
    from: filter.createdAt.from ?? undefined,
    to: filter.createdAt.to ?? undefined,
  };
}

/** URL search → filter, for the first render and for Back/Forward. */
export function searchToFilter(search: OrdersSearch): OrdersFilter {
  return {
    query: search.q ?? "",
    status: search.status ?? null,
    total: {
      min: search.min === undefined ? "" : String(search.min),
      max: search.max === undefined ? "" : String(search.max),
    },
    createdAt: { from: search.from ?? null, to: search.to ?? null },
  };
}

/** Order-stable identity of a search, to tell our own URL writes from Back/Forward. */
export function searchKey(search: OrdersSearch): string {
  return JSON.stringify([search.q, search.status, search.min, search.max, search.from, search.to]);
}

// The router JSON-parses each value (`?q=123` → 123, `?min=10.5` → 10.5);
// these read it back as the raw form the controls hold.

function rawText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function rawYmd(value: unknown): Ymd | null {
  return typeof value === "string" && YMD.test(value) ? value : null;
}

function isStatus(value: unknown): value is OrderStatus {
  return STATUSES.includes(value as OrderStatus);
}

/**
 * The route's `validateSearch`. Rather than a second set of rules, it reads the
 * URL leniently into a filter and re-serializes it with `filterToSearch` — the
 * same function that writes the URL — so a URL is valid exactly when the page
 * could have produced it. Anything else (`status=bogus`, `min=abc`,
 * `from=nope`) is dropped, never a route error.
 */
export function validateOrdersSearch(raw: Record<string, unknown>): OrdersSearch {
  return filterToSearch({
    query: rawText(raw.q),
    status: isStatus(raw.status) ? raw.status : null,
    total: { min: rawText(raw.min), max: rawText(raw.max) },
    createdAt: { from: rawYmd(raw.from), to: rawYmd(raw.to) },
  });
}
