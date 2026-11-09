import type { IGridifyQuery, Paging } from "gridify-client";

import { createRequestLog } from "@/shared/filtering/request-log";

import type { Segment } from "./customers";
import { getJson, getPage, sendJson } from "./http";

/**
 * The orders API (`src/Api/Features/Orders`). The types mirror its records:
 * `ListOrders.OrderRow`, `OrderInput`, `OrderDetail`. Statuses keep their C# enum
 * names end to end (JSON, URL, filter and column).
 */

export const STATUSES = ["Pending", "Paid", "Shipped", "Delivered", "Cancelled"] as const;
export type OrderStatus = (typeof STATUSES)[number];

export type Order = {
  orderNo: string;
  customer: string;
  status: OrderStatus;
  total: number;
  createdAt: string; // YYYY-MM-DD
};

export type OrderLine = { product: string; quantity: number; unitPrice: number };

/** What the create / update endpoints accept. */
export type OrderInput = {
  /** The customer's name. */
  customer: string;
  status: OrderStatus;
  dueDate: string; // YYYY-MM-DD
  /** The customer's purchase-order number; unique across orders. */
  reference?: string;
  lines: OrderLine[];
};

/** `GET /api/orders/:orderNo`: the full order, which the edit form starts from. */
export type OrderDetail = Omit<OrderInput, "reference"> & {
  orderNo: string;
  reference: string | null;
  createdAt: string;
};

/** `GET /api/orders/:orderNo/overview` (`GetOrderOverview.OrderOverview`): the record page's read model. */
export type OrderOverview = {
  orderNo: string;
  status: OrderStatus;
  reference: string | null;
  createdAt: string; // YYYY-MM-DD
  dueDate: string;
  lines: OrderLine[];
  total: number;
  customer: {
    customerNo: string;
    name: string;
    email: string;
    segment: Segment;
    country: string;
    active: boolean;
    isVerified: boolean;
    isVip: boolean;
    isOnHold: boolean;
    creditLimit: number;
    paymentTermsDays: number;
  };
  risk: {
    grade: string;
    /** 0 (A) to 5 (F). */
    gradeIndex: number;
    band: string;
    /** What raised the grade, worst first. */
    factors: string[];
    daysPastDue: number;
    /** The customer's unpaid (Pending) orders, this one included. */
    openExposure: number;
    creditUsedPct: number;
  };
  /** The server's today, which the risk was assessed on. */
  asOf: string;
};

const requestLog = createRequestLog();

/** Debug aid: the last list calls that came back, newest first (`useSyncExternalStore`). */
export const subscribeRequestLog = requestLog.subscribe;
export const getRequestLog = requestLog.getSnapshot;

/** `GET /api/orders`: the server filters, sorts and pages with Gridify (`ListOrders.Mapper`). */
export function fetchOrders(query: IGridifyQuery): Promise<Paging<Order>> {
  return getPage("/api/orders", query, requestLog);
}

/** A missing order is a 404, which throws: the route shows its error component. */
export function fetchOrder(orderNo: string): Promise<OrderDetail> {
  return getJson(`/api/orders/${encodeURIComponent(orderNo)}`);
}

export function fetchOrderOverview(orderNo: string): Promise<OrderOverview> {
  return getJson(`/api/orders/${encodeURIComponent(orderNo)}/overview`);
}

/** For the form's async field check; the order being edited doesn't count. */
export function isReferenceTaken(reference: string, exceptOrderNo?: string): Promise<boolean> {
  const params = new URLSearchParams({ reference });
  if (exceptOrderNo) params.set("exceptOrderNo", exceptOrderNo);
  return getJson(`/api/orders/reference-taken?${params}`);
}

/**
 * The server re-validates the input and adds its own rules (`CreateOrder` / `UpdateOrder`): unknown
 * customer, credit hold, reference already used. Each is a 400 on its field.
 */
export function createOrder(input: OrderInput) {
  return sendJson<OrderDetail>("POST", "/api/orders", input);
}

export function updateOrder(orderNo: string, input: OrderInput) {
  return sendJson<OrderDetail>("PUT", `/api/orders/${encodeURIComponent(orderNo)}`, input);
}
