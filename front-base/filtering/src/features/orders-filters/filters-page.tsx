import { useSyncExternalStore } from "react";
import { getRouteApi, useLocation } from "@tanstack/react-router";

import { formatDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { getRequestLog, subscribeRequestLog } from "./api/orders-api";
import { useOrders } from "./api/use-orders";
import { FilterBar } from "./filter-bar";
import { toGridifyFilter, type OrdersSearch } from "./filter";

const routeApi = getRouteApi("/");

/**
 * Smart page. The URL is the only filter state: the controls read it, each
 * patch is a navigation, and the route loader + `useOrders` fetch from it.
 * Back/Forward therefore needs no code. The debounce lives in the typed
 * controls (`FilterBar`), not here.
 */
export function FiltersPage() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const href = useLocation({ select: (location) => location.href });

  // Each patch is a history entry, so Back undoes a filter. It applies to the
  // current search, not this render's, since a debounced patch can land later.
  // The router runs `validateSearch` on the result, which normalizes it.
  const patch = (changes: OrdersSearch) =>
    void navigate({ search: (prev) => ({ ...prev, ...changes }) });

  // Same search, same query as the loader. The Gridify string is only shown here.
  const orders = useOrders(search);
  const gridifyFilter = toGridifyFilter(search);

  const log = useSyncExternalStore(subscribeRequestLog, getRequestLog);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">Filtering</h1>
        <p className="text-sm text-muted-foreground">
          Filter controls (typed fields debounced) → URL search → route loader + React Query → mock
          API.
        </p>
      </header>

      <FilterBar search={search} onPatch={patch} onReset={() => void navigate({ search: {} })} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">URL</h2>
        <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm">{href}</pre>
      </section>

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
              ) : orders.isError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-destructive">
                    Could not load orders: {orders.error.message}
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
        <h2 className="text-sm font-medium">Validated search</h2>
        <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs">
          {JSON.stringify(search, null, 2)}
        </pre>
      </section>
    </div>
  );
}
