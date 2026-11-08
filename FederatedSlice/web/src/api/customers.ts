import { queryOptions, useQuery } from "@tanstack/react-query";
import type { IGridifyQuery, Paging } from "gridify-client";

import { createRequestLog } from "@/shared/filtering/request-log";

import { getJson, getPage } from "./http";

/** The customers API (`src/Api/Features/Customers`); `Customer` mirrors `ListCustomers.Response`. */

export const SEGMENTS = ["Enterprise", "SMB", "Startup"] as const;
export type Segment = (typeof SEGMENTS)[number];

export const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Germany",
  "Netherlands",
  "Sweden",
] as const;
export type Country = (typeof COUNTRIES)[number];

export type Customer = {
  customerNo: string;
  name: string;
  email: string;
  segment: Segment;
  country: Country;
  active: boolean;
  creditLimit: number;
  paymentTermsDays: number;
  isVip: boolean;
  isVerified: boolean;
  isOnHold: boolean;
  createdAt: string; // YYYY-MM-DD
};

/** What a customer picker needs: the key to filter on and the name to show. */
export type CustomerRef = Pick<Customer, "customerNo" | "name">;

const requestLog = createRequestLog();

/** The last list calls that came back, newest first (`useSyncExternalStore`). */
export const subscribeRequestLog = requestLog.subscribe;
export const getRequestLog = requestLog.getSnapshot;

/** `GET /api/customers`: the server filters, sorts and pages with Gridify (`ListCustomers.Mapper`). */
export function fetchCustomers(query: IGridifyQuery): Promise<Paging<Customer>> {
  return getPage("/api/customers", query, requestLog);
}

/** `GET /api/customers/options`: every customer's number and name, sorted by name. */
export function fetchCustomerOptions(): Promise<CustomerRef[]> {
  return getJson("/api/customers/options");
}

/**
 * The name pickers' options, used by both apps (the orders filter and form, the
 * customers filter). They rarely change, so one fetch serves the session.
 */
export function customerOptionsQueryOptions() {
  return queryOptions({
    queryKey: ["customer-options"],
    queryFn: fetchCustomerOptions,
    staleTime: Infinity,
  });
}

/** The hook form of the options query, for a select field's `source: { useOptions }`. */
export function useCustomerOptions() {
  const { data = [], isPending, isError } = useQuery(customerOptionsQueryOptions());
  return { options: data, isPending, isError };
}
