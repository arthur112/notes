import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";

import { toGridifyQuery, type OrdersSearch } from "../filter";
import { fetchOrder, fetchOrders } from "./orders-api";

/**
 * One definition shared by the route loader (`queryClient.query`) and the page
 * (`useQuery`), so both hit the same cache entry. The key is the validated
 * search: the same filter, page and order mean the same entry. The Gridify query is an API
 * detail, built only when fetching.
 *
 * `staleTime` must be > 0: with 0, data the loader just fetched would already
 * be stale when the page subscribes, and the page would fetch it a second time.
 * Within the window, returning to an earlier filter is served from cache.
 */
export function ordersQueryOptions(search: OrdersSearch) {
  return queryOptions({
    queryKey: ["orders", search],
    queryFn: () => fetchOrders(toGridifyQuery(search)),
    staleTime: 30_000,
  });
}

/** `keepPreviousData` keeps the last rows on screen while the next filter loads. */
export function useOrders(search: OrdersSearch) {
  return useQuery({ ...ordersQueryOptions(search), placeholderData: keepPreviousData });
}

/** One order, for the edit route's loader and its form. */
export function orderQueryOptions(orderNo: string) {
  return queryOptions({
    queryKey: ["order", orderNo],
    queryFn: () => fetchOrder(orderNo),
    staleTime: 30_000,
  });
}
