import { apiRequest } from "@/shared/lib/api-client";
import type { CreateOrderInput, Order, OrderStatus } from "../types/order";
import type { GridifyPageQuery, OrderTotals, PagedResult } from "./gridify-query";

/**
 * Order endpoint functions — the only place that knows the wire shape.
 * (Swap the mock backend for a real API by replacing api-client's transport,
 * not these calls.)
 */

export function fetchOrdersPage(query: GridifyPageQuery): Promise<PagedResult<Order>> {
  return apiRequest("GET", "/api/orders", { query });
}

/** Single read model by its human order number — what the detail route carries. */
export function fetchOrder(orderNo: string): Promise<Order> {
  return apiRequest("GET", `/api/orders/${encodeURIComponent(orderNo)}`);
}

export function fetchOrderTotals(filter: string): Promise<OrderTotals> {
  return apiRequest("GET", "/api/orders/aggregate", { query: { filter } });
}

export function createOrder(input: CreateOrderInput): Promise<Order> {
  return apiRequest("POST", "/api/orders", { body: input });
}

export function setOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  return apiRequest("PATCH", `/api/orders/${id}/status`, { body: { status } });
}
