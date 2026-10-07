import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";

import { fetchOrders } from "./orders-api";

/**
 * One definition shared by the route loader (`prefetchQuery`) and the page
 * (`useQuery`), so both hit the same cache entry. The Gridify filter string
 * **is** the key: a new string means a new fetch.
 *
 * `staleTime` must be > 0: with 0, data the loader just fetched would already
 * be stale when the page subscribes, and the page would fetch it a second time.
 * Within the window, returning to an earlier filter is served from cache.
 */
export function ordersQueryOptions(filter: string) {
  return queryOptions({
    queryKey: ["orders", filter],
    queryFn: () => fetchOrders(filter),
    staleTime: 30_000,
  });
}

/** `keepPreviousData` keeps the last rows on screen while the next filter loads. */
export function useOrders(filter: string) {
  return useQuery({ ...ordersQueryOptions(filter), placeholderData: keepPreviousData });
}
