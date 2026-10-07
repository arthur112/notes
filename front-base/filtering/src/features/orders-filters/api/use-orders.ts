import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchOrders } from "./orders-api";

export const orderQueryKeys = {
  all: ["orders"] as const,
  list: (filter: string) => ["orders", "list", filter] as const,
} as const;

/**
 * The Gridify filter string **is** the query key: a new string means a new
 * cache entry and a fetch. `keepPreviousData` keeps the last rows on screen
 * while the next request is in flight. With the default `staleTime: 0`, going
 * back to an earlier filter shows its cached rows instantly and still refetches.
 */
export function useOrders(filter: string) {
  return useQuery({
    queryKey: orderQueryKeys.list(filter),
    queryFn: () => fetchOrders(filter),
    placeholderData: keepPreviousData,
  });
}
