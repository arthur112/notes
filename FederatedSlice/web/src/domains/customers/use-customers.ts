import {
  keepPreviousData,
  noop,
  queryOptions,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";

import { fetchCustomers } from "@/api/customers";

import { customersSearchSchema, toGridifyQuery, type CustomersSearch } from "./filter";

/**
 * Same shape as the orders queries: one `queryOptions` shared by the route
 * loader and the page, keyed by the validated search; the Gridify query is an
 * API detail built only when fetching.
 */
export function customersQueryOptions(search: CustomersSearch) {
  return queryOptions({
    queryKey: ["customers", search],
    queryFn: () => fetchCustomers(toGridifyQuery(search)),
    staleTime: 30_000,
  });
}

/** `keepPreviousData` keeps the last rows on screen while the next filter loads. */
export function useCustomers(search: CustomersSearch) {
  return useQuery({ ...customersQueryOptions(search), placeholderData: keepPreviousData });
}

/** Every app's customers list route spreads these (see `ordersListRoute`). */
export const customersListRoute = {
  validateSearch: customersSearchSchema,
  loaderDeps: ({ search }: { search: CustomersSearch }) => search,
  loader: ({ context, deps }: { context: { queryClient: QueryClient }; deps: CustomersSearch }) => {
    context.queryClient.query(customersQueryOptions(deps)).catch(noop);
  },
};
