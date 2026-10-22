import type { IGridifyQuery, Paging } from "gridify-client";

import {
  compareBy,
  createRequestLog,
  toQueryString,
  type RequestLogEntry,
} from "@/shared/filtering/request-log";

import type { Country, Segment } from "../filter";

/**
 * Mock customers API over an in-memory store. `GET /api/customers?page=…&pageSize=…&orderBy=…&filter=…`
 * receives the Gridify query the way a real API would, logs it, simulates
 * latency, and returns one sorted page plus the total count. Like the orders
 * mock it applies `orderBy` and paging but not the filter: the point is to see
 * each filter change produce exactly one request.
 */

export type Customer = {
  customerNo: string;
  name: string;
  email: string;
  segment: Segment;
  country: Country;
  active: boolean;
  creditLimit: number;
  createdAt: string; // YYYY-MM-DD
};

/** What a customer picker needs: the key to filter on and the name to show. */
export type CustomerRef = Pick<Customer, "customerNo" | "name">;

export type CustomersResponse = Paging<Customer> & RequestLogEntry;

const customers: Customer[] = [
  {
    customerNo: "CUS-1001",
    name: "Acme Corp",
    email: "billing@acme.test",
    segment: "Enterprise",
    country: "United States",
    active: true,
    creditLimit: 250_000,
    createdAt: "2024-03-11",
  },
  {
    customerNo: "CUS-1002",
    name: "Globex",
    email: "accounts@globex.test",
    segment: "SMB",
    country: "Netherlands",
    active: true,
    creditLimit: 80_000,
    createdAt: "2024-06-02",
  },
  {
    customerNo: "CUS-1003",
    name: "Initech",
    email: "finance@initech.test",
    segment: "Enterprise",
    country: "United States",
    active: true,
    creditLimit: 120_000,
    createdAt: "2024-09-19",
  },
  {
    customerNo: "CUS-1004",
    name: "Umbrella",
    email: "orders@umbrella.test",
    segment: "Enterprise",
    country: "United Kingdom",
    active: true,
    creditLimit: 400_000,
    createdAt: "2024-11-05",
  },
  {
    customerNo: "CUS-1005",
    name: "Hooli",
    email: "ap@hooli.test",
    segment: "SMB",
    country: "United States",
    active: false,
    creditLimit: 60_000,
    createdAt: "2025-01-23",
  },
  {
    customerNo: "CUS-1006",
    name: "Vandelay Industries",
    email: "imports@vandelay.test",
    segment: "SMB",
    country: "United States",
    active: true,
    creditLimit: 90_000,
    createdAt: "2025-02-14",
  },
  {
    customerNo: "CUS-1007",
    name: "Soylent Corp",
    email: "procurement@soylent.test",
    segment: "Startup",
    country: "Germany",
    active: true,
    creditLimit: 25_000,
    createdAt: "2025-03-30",
  },
  {
    customerNo: "CUS-1008",
    name: "Stark Industries",
    email: "billing@stark.test",
    segment: "Enterprise",
    country: "United States",
    active: true,
    creditLimit: 900_000,
    createdAt: "2025-05-12",
  },
  {
    customerNo: "CUS-1009",
    name: "Wayne Enterprises",
    email: "accounts@wayne.test",
    segment: "Enterprise",
    country: "United States",
    active: false,
    creditLimit: 750_000,
    createdAt: "2025-06-08",
  },
  {
    customerNo: "CUS-1010",
    name: "Cyberdyne Systems",
    email: "ap@cyberdyne.test",
    segment: "Startup",
    country: "United States",
    active: true,
    creditLimit: 15_000,
    createdAt: "2025-08-21",
  },
  {
    customerNo: "CUS-1011",
    name: "Massive Dynamic",
    email: "finance@massive.test",
    segment: "Enterprise",
    country: "Sweden",
    active: true,
    creditLimit: 320_000,
    createdAt: "2025-10-03",
  },
  {
    customerNo: "CUS-1012",
    name: "Pied Piper",
    email: "admin@piedpiper.test",
    segment: "Startup",
    country: "United States",
    active: false,
    creditLimit: 5_000,
    createdAt: "2026-01-17",
  },
];

/** The server's Gridify mapper: the fields `orderBy` may name → the row value. */
const SORT_ACCESSORS: Record<string, (customer: Customer) => string | number> = {
  name: (customer) => customer.name,
  segment: (customer) => customer.segment,
  country: (customer) => customer.country,
  active: (customer) => Number(customer.active),
  creditLimit: (customer) => customer.creditLimit,
  createdAt: (customer) => customer.createdAt,
};

let requestCount = 0;
const requestLog = createRequestLog();

/** The last calls that reached the mock "server", newest first (`useSyncExternalStore`). */
export const subscribeRequestLog = requestLog.subscribe;
export const getRequestLog = requestLog.getSnapshot;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchCustomers(query: IGridifyQuery): Promise<CustomersResponse> {
  const requestNo = ++requestCount;
  const queryString = toQueryString(query);
  console.info(`[mock] #${requestNo} GET /api/customers?${queryString}`, query);

  await sleep(300);

  const receivedAt = new Date().toISOString();
  requestLog.record({ requestNo, query: queryString, receivedAt });

  const rows = [...customers].sort(compareBy(query.orderBy, SORT_ACCESSORS));
  const start = (query.page - 1) * query.pageSize;

  return {
    requestNo,
    query: queryString,
    receivedAt,
    count: rows.length,
    data: rows.slice(start, start + query.pageSize),
  };
}

/** `GET /api/customers/options`: the names the order form's customer picker offers. */
export async function fetchCustomerOptions(): Promise<CustomerRef[]> {
  console.info("[mock] GET /api/customers/options");
  await sleep(300);
  return customers.map(({ customerNo, name }) => ({ customerNo, name }));
}
