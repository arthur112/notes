import { getDb } from "./db";
import { applyQuery, parseFilter, matchNode } from "./gridify";
import { round2 } from "@/shared/lib/format";
import { ORDER_STATUSES } from "@/shared/domain/orders/types/order";
import type { Order, OrderStatus, CreateOrderInput } from "@/shared/domain/orders/types/order";
import type { OrderTotals } from "@/shared/domain/orders/api/gridify-query";
import type { Customer } from "@/shared/domain/customers/types/customer";
import type { Contract } from "@/shared/domain/contracts/types/contract";

// The aggregate body IS the shared contract type — re-exported so the mock's
// public surface keeps the name it exposed before.
export type { OrderTotals };

/**
 * The mock "server": routes that a real Gridify-enabled API would expose.
 * Paths mirror the future real endpoints so swapping the transport is
 * mechanical. Handlers mutate the seeded in-memory database and simulate
 * network latency.
 */

export interface MockRequest {
  method: "GET" | "POST" | "PATCH";
  path: string; // path without query string
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
}

export interface PagedOrders {
  data: Order[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PagedCustomers {
  data: Customer[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Every body the mock server can return. */
export type MockBody = PagedOrders | PagedCustomers | OrderTotals | Order | Contract;

export type MockHandler = (req: MockRequest) => MockBody;

export class MockHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "MockHttpError";
    this.status = status;
  }
}

interface Route {
  method: MockRequest["method"];
  pattern: RegExp;
  handler: MockHandler;
}

const routes: Route[] = [];

export function registerHandler(
  method: MockRequest["method"],
  pattern: RegExp,
  handler: MockHandler,
): void {
  routes.push({ method, pattern, handler });
}

export function handleMockRequest(req: MockRequest): MockBody {
  const route = routes.find((r) => r.method === req.method && r.pattern.test(req.path));
  if (!route) throw new MockHttpError(404, `No route for ${req.method} ${req.path}`);
  const match = route.pattern.exec(req.path);
  const params: Record<string, string> = {};
  if (match?.groups) Object.assign(params, match.groups);
  return route.handler({ ...req, params });
}

function matches<T extends object>(record: T, filter: string | undefined): boolean {
  const node = parseFilter(filter);
  return node ? matchNode(record, node) : true;
}

// --- routes ------------------------------------------------------------------

registerHandler("GET", /^\/api\/orders$/, (req) => {
  const db = getDb();
  return applyQuery(db.orders, {
    filter: req.query.filter,
    orderBy: req.query.orderBy,
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 20,
  });
});

registerHandler("GET", /^\/api\/orders\/aggregate$/, (req) => {
  const db = getDb();
  const filtered = db.orders.filter((o) => matches(o, req.query.filter));
  const totals: OrderTotals = filtered.reduce(
    (acc, o) => {
      acc.count += 1;
      acc.subtotal = round2(acc.subtotal + o.subtotal);
      acc.tax = round2(acc.tax + o.tax);
      acc.total = round2(acc.total + o.total);
      acc.units += o.items.reduce((sum, item) => sum + item.quantity, 0);
      acc.byStatus[o.status] += 1;
      return acc;
    },
    {
      count: 0,
      subtotal: 0,
      tax: 0,
      total: 0,
      units: 0,
      customers: 0,
      byStatus: Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0])) as Record<
        OrderStatus,
        number
      >,
    },
  );
  totals.customers = new Set(filtered.map((o) => o.customer.id)).size;
  return totals;
});

// Registered after `/aggregate` so the catch-all segment never shadows it.
registerHandler("GET", /^\/api\/orders\/(?<orderNo>[^/]+)$/, (req) => {
  const db = getDb();
  const order = db.orders.find((o) => o.orderNo === req.params.orderNo);
  if (!order) throw new MockHttpError(404, `Order "${req.params.orderNo}" not found`);
  return { ...order };
});

registerHandler("POST", /^\/api\/orders$/, (req) => {
  const db = getDb();
  const input = req.body as CreateOrderInput;
  const customer = db.customers.find((c) => c.id === input.customerId);
  if (!customer) throw new MockHttpError(422, `Unknown customer "${input.customerId}"`);

  const subtotal = round2(
    input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  );
  const tax = round2(subtotal * 0.21);
  const id = db.nextOrderId();
  const createdAt = new Date().toISOString();

  const order: Order = {
    id,
    orderNo: `ORD-${String(100_000 + id)}`,
    customer: { id: customer.id, name: customer.name, country: customer.country },
    channel: input.channel,
    status: "pending",
    items: input.items.map((item) => ({ ...item })),
    subtotal,
    tax,
    total: round2(subtotal + tax),
    currency: "EUR",
    createdAt,
    dueDate: input.dueDate,
    paidAt: null,
    note: input.note?.trim() || null,
  };
  db.orders.push(order);
  return order;
});

registerHandler("PATCH", /^\/api\/orders\/(?<id>\d+)\/status$/, (req) => {
  const db = getDb();
  const order = db.orders.find((o) => o.id === Number(req.params.id));
  if (!order) throw new MockHttpError(404, `Order ${req.params.id} not found`);
  const status = (req.body as { status: Order["status"] }).status;
  if (!ORDER_STATUSES.includes(status)) {
    throw new MockHttpError(422, `Invalid status "${status}"`);
  }
  order.status = status;
  if (status === "delivered" && !order.paidAt) order.paidAt = new Date().toISOString();
  if (status === "cancelled" || status === "pending") order.paidAt = null;
  return { ...order };
});

registerHandler("GET", /^\/api\/contracts\/(?<contractNo>[^/]+)$/, (req) => {
  const db = getDb();
  const contract = db.contracts.find((c) => c.contractNo === req.params.contractNo);
  if (!contract) throw new MockHttpError(404, `Contract "${req.params.contractNo}" not found`);
  return { ...contract };
});

registerHandler("GET", /^\/api\/customers$/, (req) => {
  const db = getDb();
  return applyQuery(db.customers, {
    filter: req.query.filter,
    orderBy: req.query.orderBy,
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 50,
  });
});
