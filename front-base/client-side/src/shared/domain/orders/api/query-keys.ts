import type { GridifyPageQuery } from "./gridify-query";

/**
 * TanStack Query key factories — every cache read/write goes through these so
 * invalidation stays predictable when the apps add/remove filters.
 */
export const orderQueryKeys = {
  all: ["orders"] as const,
  page: (query: GridifyPageQuery) => ["orders", "page", query] as const,
  totals: (filter: string) => ["orders", "totals", filter] as const,
  detail: (orderNo: string) => ["orders", "detail", orderNo] as const,
} as const;
