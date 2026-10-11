import type { OrderStatus } from "../filter";

/**
 * Mock `GET /api/orders?filter=…`. It receives the Gridify filter string the
 * way a real API would, logs it, simulates latency, and returns fixed rows plus
 * an echo of what it received. It does **not** evaluate the filter: the point
 * is to see each filter change produce exactly one request.
 */

export type Order = {
  orderNo: string;
  customer: string;
  status: OrderStatus;
  total: number;
  createdAt: string; // YYYY-MM-DD
};

export type OrdersResponse = {
  /** Increments on every call that reaches the "server". */
  requestNo: number;
  /** The Gridify filter string the server received. */
  filter: string;
  receivedAt: string;
  data: Order[];
};

const MOCK_ORDERS: Order[] = [
  {
    orderNo: "ORD-100101",
    customer: "Acme Corp",
    status: "paid",
    total: 129.9,
    createdAt: "2026-01-04",
  },
  {
    orderNo: "ORD-100102",
    customer: "Globex",
    status: "pending",
    total: 54,
    createdAt: "2026-01-11",
  },
  {
    orderNo: "ORD-100103",
    customer: "Initech",
    status: "shipped",
    total: 310.5,
    createdAt: "2026-01-19",
  },
  {
    orderNo: "ORD-100104",
    customer: "Umbrella",
    status: "delivered",
    total: 18.75,
    createdAt: "2026-02-02",
  },
  {
    orderNo: "ORD-100105",
    customer: "Acme Corp",
    status: "cancelled",
    total: 92,
    createdAt: "2026-02-14",
  },
  {
    orderNo: "ORD-100106",
    customer: "Hooli",
    status: "paid",
    total: 1240,
    createdAt: "2026-03-01",
  },
];

let requestCount = 0;

export type RequestLogEntry = Pick<OrdersResponse, "requestNo" | "filter" | "receivedAt">;

const MAX_LOG_ENTRIES = 10;
let requestLog: RequestLogEntry[] = [];
const logListeners = new Set<() => void>();

/** Debug aid: the last calls that reached the mock "server", newest first (`useSyncExternalStore`). */
export function subscribeRequestLog(listener: () => void): () => void {
  logListeners.add(listener);
  return () => logListeners.delete(listener);
}

export function getRequestLog(): RequestLogEntry[] {
  return requestLog;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchOrders(filter: string): Promise<OrdersResponse> {
  const requestNo = ++requestCount;
  const search = filter ? `?filter=${encodeURIComponent(filter)}` : "";
  console.info(`[mock] #${requestNo} GET /api/orders${search}`, { filter });

  await sleep(300);

  const receivedAt = new Date().toISOString();
  requestLog = [{ requestNo, filter, receivedAt }, ...requestLog].slice(0, MAX_LOG_ENTRIES);
  logListeners.forEach((listener) => listener());

  return { requestNo, filter, receivedAt, data: structuredClone(MOCK_ORDERS) };
}
