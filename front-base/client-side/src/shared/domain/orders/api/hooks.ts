import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreateOrderInput, Order, OrderStatus } from "../types/order";
import type { GridifyPageQuery, OrderTotals, PagedResult } from "./gridify-query";
import {
  fetchOrder,
  fetchOrderTotals,
  fetchOrdersPage,
  createOrder,
  setOrderStatus,
} from "./order-api";
import { orderQueryKeys } from "./query-keys";

/**
 * Hooks-like modules for order queries/mutations — the shared data layer that
 * both order apps consume. Apps stay ignorant of the wire format.
 */

export function useOrdersPage(query: GridifyPageQuery): {
  data: PagedResult<Order> | undefined;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
} {
  const result = useQuery({
    queryKey: orderQueryKeys.page(query),
    queryFn: () => fetchOrdersPage(query),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
  return {
    data: result.data,
    isPending: result.isPending,
    isError: result.isError,
    isFetching: result.isFetching,
    refetch: () => void result.refetch(),
  };
}

/** One order by number, for the Ops detail route. */
export function useOrder(orderNo: string): {
  data: Order | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const result = useQuery({
    queryKey: orderQueryKeys.detail(orderNo),
    queryFn: () => fetchOrder(orderNo),
    staleTime: 15_000,
    retry: false,
  });
  return {
    data: result.data,
    isPending: result.isPending,
    isError: result.isError,
    error: result.error,
    refetch: () => void result.refetch(),
  };
}

export function useOrderTotals(filter: string): {
  data: OrderTotals | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const result = useQuery({
    queryKey: orderQueryKeys.totals(filter),
    queryFn: () => fetchOrderTotals(filter),
    staleTime: 15_000,
  });
  return {
    data: result.data,
    isPending: result.isPending,
    isError: result.isError,
    refetch: () => void result.refetch(),
  };
}

function invalidateOrders(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
}

/** Server-side creation: totals computed on "the server", cache invalidated. */
export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: (order) => {
      invalidateOrders(queryClient);
      toast.success(`Order ${order.orderNo} created`, {
        description: `${order.customer.name} · ${order.total.toLocaleString("en-IE", {
          style: "currency",
          currency: "EUR",
        })}`,
      });
    },
    onError: (error: Error) => {
      toast.error("Could not create the order", { description: error.message });
    },
  });
}

export function useSetOrderStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) => setOrderStatus(id, status),
    onSuccess: (order) => {
      invalidateOrders(queryClient);
      toast.success(`Order ${order.orderNo} marked as ${order.status}`);
    },
    onError: (error: Error) => {
      toast.error("Could not update the order", { description: error.message });
    },
  });
}
