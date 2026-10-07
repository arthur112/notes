import { useCallback, useEffect, useMemo, useState } from "react";

import { useDebouncedValue } from "@/shared/hooks/use-debounce";
import { formatDate } from "@/shared/lib/format";
import { buildFilter } from "@/shared/lib/gridify";
import { cn } from "@/shared/lib/utils";

import type { OrdersResponse } from "./api/orders-api";
import { useOrders } from "./api/use-orders";
import { FilterBar } from "./filter-bar";
import { DEFAULT_ORDERS_FILTER, toConditions, type OrdersFilter } from "./filter";

type RequestLogEntry = Pick<OrdersResponse, "requestNo" | "filter" | "receivedAt">;

const MAX_LOG_ENTRIES = 10;

/**
 * Smart page: owns the filter object in component state and derives the
 * Gridify filter string from a **debounced** copy of it — the controls stay
 * instant, the query only rebuilds once input settles. The string feeds
 * `useOrders`, so every settled change is one request to the mock API.
 */
export function FiltersPage() {
  const [filter, setFilter] = useState<OrdersFilter>(DEFAULT_ORDERS_FILTER);
  const debouncedFilter = useDebouncedValue(filter, 350);

  const patchFilter = useCallback((patch: Partial<OrdersFilter>) => {
    setFilter((current) => ({ ...current, ...patch }));
  }, []);

  const resetFilter = useCallback(() => setFilter(DEFAULT_ORDERS_FILTER), []);

  const conditions = useMemo(() => toConditions(debouncedFilter), [debouncedFilter]);
  const gridifyFilter = useMemo(() => buildFilter(conditions), [conditions]);

  const orders = useOrders(gridifyFilter);

  // Debug aid: one log line per response that reached the mock "server".
  const [log, setLog] = useState<RequestLogEntry[]>([]);
  const response = orders.data;
  useEffect(() => {
    if (!response) return;
    const { requestNo, filter: received, receivedAt } = response;
    setLog((current) =>
      current.some((entry) => entry.requestNo === requestNo)
        ? current
        : [{ requestNo, filter: received, receivedAt }, ...current].slice(0, MAX_LOG_ENTRIES),
    );
  }, [response]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">Filtering</h1>
        <p className="text-sm text-muted-foreground">
          A filter object in page state → Gridify filter string → React Query → mock API.
        </p>
      </header>

      <FilterBar filter={filter} onPatch={patchFilter} onReset={resetFilter} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Gridify filter</h2>
        <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm">
          {gridifyFilter || "(no filter)"}
        </pre>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">Requests</h2>
          <span
            role="status"
            className={cn(
              "rounded-full px-2 py-0.5 text-xs",
              orders.isFetching ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {orders.isFetching ? "Fetching…" : orders.isError ? "Error" : "Idle"}
          </span>
        </div>
        <ol className="divide-y rounded-lg border text-sm">
          {log.length === 0 ? (
            <li className="px-4 py-3 text-muted-foreground">No request yet.</li>
          ) : (
            log.map((entry) => (
              <li key={entry.requestNo} className="flex gap-3 px-4 py-2">
                <span className="w-8 shrink-0 text-muted-foreground tabular-nums">
                  #{entry.requestNo}
                </span>
                <span className="w-20 shrink-0 text-muted-foreground tabular-nums">
                  {entry.receivedAt.slice(11, 19)}
                </span>
                <code className="min-w-0 break-all">{entry.filter || "(no filter)"}</code>
              </li>
            ))
          )}
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">
          Orders{" "}
          <span className="text-muted-foreground">(mock rows — the filter is not applied)</span>
        </h2>
        <div
          aria-busy={orders.isFetching}
          className={cn(
            "overflow-x-auto rounded-lg border transition-opacity",
            orders.isFetching && "opacity-60",
          )}
        >
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.isPending ? (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : (
                orders.data?.data.map((order) => (
                  <tr key={order.orderNo}>
                    <td className="px-4 py-2 font-medium">{order.orderNo}</td>
                    <td className="px-4 py-2">{order.customer}</td>
                    <td className="px-4 py-2 capitalize">{order.status}</td>
                    <td className="px-4 py-2 tabular-nums">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{order.total.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Filter object</h2>
        <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs">
          {JSON.stringify(filter, null, 2)}
        </pre>
      </section>
    </div>
  );
}
