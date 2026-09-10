import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/shared/lib/api-client";
import type { PagedResult } from "@/shared/domain/orders/api/gridify-query";
import type { Customer } from "@/shared/domain/customers/types/customer";

/**
 * Customers list — used only by the Ops "create order" form (the Finance app
 * never fetches customers), so the hooks live feature-locally instead of in
 * shared/domain. Endpoint function kept next to the keys for the same reason.
 */

export const customersQueryKeys = {
  all: ["customers"] as const,
  list: () => [...customersQueryKeys.all, "list"] as const,
} as const;

export function fetchCustomers(): Promise<PagedResult<Customer>> {
  return apiRequest("GET", "/api/customers", {
    query: { page: 1, pageSize: 100, orderBy: "name" },
  });
}

export function useCustomers() {
  const result = useQuery({
    queryKey: customersQueryKeys.list(),
    queryFn: fetchCustomers,
    staleTime: 60_000,
  });
  return { customers: result.data?.data ?? [], isPending: result.isPending };
}
