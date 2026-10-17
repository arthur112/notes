import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";

import { toGridifyQuery, type CustomersSearch } from "../filter";
import { fetchCustomerOptions, fetchCustomers } from "./customers-api";

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

/** The name pickers' options. They rarely change, so one fetch serves the session. */
export function customerOptionsQueryOptions() {
  return queryOptions({
    queryKey: ["customer-options"],
    queryFn: async () =>
      (await fetchCustomerOptions()).map((name) => ({ value: name, label: name })),
    staleTime: Infinity,
  });
}

/** The hook form of the options query, for `multiSelectField({ useOptions })`. */
export function useCustomerOptions() {
  const { data = [], isPending, isError } = useQuery(customerOptionsQueryOptions());
  return { options: data, isPending, isError };
}
