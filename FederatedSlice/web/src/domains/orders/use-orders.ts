import {
  keepPreviousData,
  noop,
  queryOptions,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";

import { fetchOrder, fetchOrderOverview, fetchOrders } from "@/api/orders";

import { ordersSearchSchema, toGridifyQuery, type OrdersSearch } from "./filter";

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

/**
 * One order's record page. Under the `["order", orderNo]` key, so a save (which
 * invalidates `["order"]`) refreshes it too.
 */
export function orderOverviewQueryOptions(orderNo: string) {
  return queryOptions({
    queryKey: ["order", orderNo, "overview"],
    queryFn: () => fetchOrderOverview(orderNo),
    staleTime: 30_000,
  });
}

type LoaderContext = { context: { queryClient: QueryClient } };

/** The record page's loader: awaited, so a missing order is the route's error, not an empty page. */
export const orderOverviewRouteLoader = ({
  context,
  params,
}: LoaderContext & { params: { orderNo: string } }) =>
  context.queryClient.query(orderOverviewQueryOptions(params.orderNo));

/**
 * Every app's orders list route spreads these: `createFileRoute(…)({ ...ordersListRoute, component })`.
 * - `validateSearch`: the filter definition's schema reads the URL leniently.
 * - `loaderDeps`: the loader re-runs whenever the search (= the settled filter) changes.
 * - `loader`: starts the fetch without awaiting it, so the page (and its filter
 *   bar) shows at once with its own loading state. On a cold load the request
 *   runs in parallel with the download of the app's code-split chunk instead of
 *   after it; the page's useQuery joins the in-flight request.
 */
export const ordersListRoute = {
  validateSearch: ordersSearchSchema,
  loaderDeps: ({ search }: { search: OrdersSearch }) => search,
  loader: ({ context, deps }: LoaderContext & { deps: OrdersSearch }) => {
    context.queryClient.query(ordersQueryOptions(deps)).catch(noop);
  },
};

/**
 * An order route's loader. Awaited, unlike the list's: the form reads its
 * defaults once, at mount, so the order must be there before the page renders.
 */
export const orderRouteLoader = ({
  context,
  params,
}: LoaderContext & { params: { orderNo: string } }) =>
  context.queryClient.query({ ...orderQueryOptions(params.orderNo), staleTime: "static" });
