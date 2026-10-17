import type { IGridifyQuery, Paging } from "gridify-client";

import {
  compareBy,
  createRequestLog,
  toQueryString,
  type RequestLogEntry,
} from "@/shared/filtering/request-log";

import type { OrderStatus } from "../filter";

/**
 * Mock orders API over an in-memory store. `GET /api/orders?page=…&pageSize=…&orderBy=…&filter=…`
 * receives the Gridify query the way a real API would, logs it, simulates
 * latency, and returns one sorted page plus the total count (Gridify's
 * `Paging<T>`) and an echo of what it received. It applies `orderBy` and the
 * paging but does **not** evaluate the filter: the point is to see each filter
 * change produce exactly one request. The detail and save endpoints feed the order form.
 */

export type Order = {
  orderNo: string;
  customer: string;
  status: OrderStatus;
  total: number;
  createdAt: string; // YYYY-MM-DD
};

export type OrdersResponse = Paging<Order> & RequestLogEntry;

export type OrderLine = { product: string; quantity: number; unitPrice: number };

/** What the create / update endpoints accept. */
export type OrderInput = {
  customer: string;
  status: OrderStatus;
  dueDate: string; // YYYY-MM-DD
  /** The customer's purchase-order number; unique across orders. */
  reference?: string;
  lines: OrderLine[];
};

/** `GET /api/orders/:orderNo`: the full order, which the edit form starts from. */
export type OrderDetail = OrderInput & { orderNo: string; createdAt: string };

/** The "database". The list, detail and save endpoints all read and write it. */
const orders: OrderDetail[] = [
  {
    orderNo: "ORD-100101",
    customer: "Acme Corp",
    status: "paid",
    createdAt: "2026-01-04",
    dueDate: "2026-01-18",
    reference: "PO-1001",
    lines: [{ product: "Anvil", quantity: 3, unitPrice: 43.3 }],
  },
  {
    orderNo: "ORD-100102",
    customer: "Globex",
    status: "pending",
    createdAt: "2026-01-11",
    dueDate: "2026-01-25",
    lines: [{ product: "Hammock", quantity: 2, unitPrice: 27 }],
  },
  {
    orderNo: "ORD-100103",
    customer: "Initech",
    status: "shipped",
    createdAt: "2026-01-19",
    dueDate: "2026-02-02",
    lines: [{ product: "Stapler", quantity: 1, unitPrice: 310.5 }],
  },
  {
    orderNo: "ORD-100104",
    customer: "Umbrella",
    status: "delivered",
    createdAt: "2026-02-02",
    dueDate: "2026-02-16",
    lines: [{ product: "Umbrella", quantity: 5, unitPrice: 3.75 }],
  },
  {
    orderNo: "ORD-100105",
    customer: "Acme Corp",
    status: "cancelled",
    createdAt: "2026-02-14",
    dueDate: "2026-02-28",
    lines: [{ product: "Rocket skates", quantity: 4, unitPrice: 23 }],
  },
  {
    orderNo: "ORD-100106",
    customer: "Hooli",
    status: "paid",
    createdAt: "2026-03-01",
    dueDate: "2026-03-15",
    lines: [{ product: "Server rack", quantity: 2, unitPrice: 620 }],
  },
];

function orderTotal(lines: OrderLine[]): number {
  return Math.round(lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0) * 100) / 100;
}

let requestCount = 0;
const requestLog = createRequestLog();

/** Debug aid: the last calls that reached the mock "server", newest first (`useSyncExternalStore`). */
export const subscribeRequestLog = requestLog.subscribe;
export const getRequestLog = requestLog.getSnapshot;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The server's Gridify mapper: the fields `orderBy` may name → the row value. */
const SORT_ACCESSORS: Record<string, (order: Order) => string | number> = {
  orderNo: (order) => order.orderNo,
  "customer.name": (order) => order.customer,
  status: (order) => order.status,
  createdAt: (order) => order.createdAt,
  total: (order) => order.total,
};

export async function fetchOrders(query: IGridifyQuery): Promise<OrdersResponse> {
  const requestNo = ++requestCount;
  const queryString = toQueryString(query);
  console.info(`[mock] #${requestNo} GET /api/orders?${queryString}`, query);

  await sleep(300);

  const receivedAt = new Date().toISOString();
  requestLog.record({ requestNo, query: queryString, receivedAt });

  const rows = orders
    .map(({ orderNo, customer, status, createdAt, lines }) => ({
      orderNo,
      customer,
      status,
      createdAt,
      total: orderTotal(lines),
    }))
    .sort(compareBy(query.orderBy, SORT_ACCESSORS));
  const start = (query.page - 1) * query.pageSize;

  return {
    requestNo,
    query: queryString,
    receivedAt,
    count: rows.length,
    data: rows.slice(start, start + query.pageSize),
  };
}

/** A 422: the server's own rules, keyed by form field name. */
export class OrderValidationError extends Error {
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    super("The server rejected the order.");
    this.fields = fields;
  }
}

function findOrder(orderNo: string): OrderDetail {
  const order = orders.find((o) => o.orderNo === orderNo);
  if (!order) throw new Error(`Order ${orderNo} not found.`);
  return order;
}

export async function fetchOrder(orderNo: string): Promise<OrderDetail> {
  console.info(`[mock] GET /api/orders/${orderNo}`);
  await sleep(300);
  return structuredClone(findOrder(orderNo));
}

/** `GET /api/orders/reference-taken?reference=…`, for the form's async field check. */
export async function isReferenceTaken(
  reference: string,
  exceptOrderNo?: string,
): Promise<boolean> {
  console.info(`[mock] GET /api/orders/reference-taken?reference=${reference}`);
  await sleep(300);
  return orders.some((o) => o.reference === reference && o.orderNo !== exceptOrderNo);
}

/**
 * The server's own rules. The credit hold is known only here; the reference
 * check repeats the form's async one, since a client check is only a hint.
 */
function checkServerRules(input: OrderInput, orderNo?: string): void {
  const fields: Record<string, string> = {};
  if (input.customer === "Umbrella") fields.customer = "Umbrella is on credit hold.";
  if (
    input.reference &&
    orders.some((o) => o.reference === input.reference && o.orderNo !== orderNo)
  ) {
    fields.reference = "Already used on another order";
  }
  if (Object.keys(fields).length > 0) throw new OrderValidationError(fields);
}

export async function createOrder(input: OrderInput): Promise<OrderDetail> {
  console.info("[mock] POST /api/orders", input);
  await sleep(300);
  checkServerRules(input);
  const order: OrderDetail = {
    ...input,
    orderNo: `ORD-${100101 + orders.length}`,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  orders.unshift(order);
  return structuredClone(order);
}

export async function updateOrder(orderNo: string, input: OrderInput): Promise<OrderDetail> {
  console.info(`[mock] PUT /api/orders/${orderNo}`, input);
  await sleep(300);
  checkServerRules(input, orderNo);
  const order = Object.assign(findOrder(orderNo), input);
  return structuredClone(order);
}
