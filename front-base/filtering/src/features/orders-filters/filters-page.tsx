import { useSyncExternalStore } from "react";
import type { SortingState } from "@tanstack/react-table";
import { Link, getRouteApi, useLocation } from "@tanstack/react-router";

import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

import { getRequestLog, subscribeRequestLog } from "./api/orders-api";
import { useOrders } from "./api/use-orders";
import { FilterBar } from "./filter-bar";
import { DEFAULT_PAGE_SIZE, toGridifyQuery, type OrdersSearchInput } from "./filter";
import { OrdersTable } from "./orders-table";

const NO_SORT: SortingState = [];

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
  // The router runs `validateSearch` on the result, which parses the raw values.
  // A new filter or order starts again at page 1; page 1 and the default page
  // size stay out of the URL, so `/` and `?page=1` are one cache entry.
  const patch = (changes: OrdersSearchInput) =>
    void navigate({ search: (prev) => ({ ...prev, ...changes, page: undefined }) });

  // Same search, same query as the loader. The Gridify query is only shown here.
  const orders = useOrders(search);
  const gridifyQuery = toGridifyQuery(search);

  const log = useSyncExternalStore(subscribeRequestLog, getRequestLog);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Filtering</h1>
          <p className="text-sm text-muted-foreground">
            Filter controls (typed fields debounced) → URL search → route loader + React Query →
            mock API.
          </p>
        </div>
        <Link to="/orders/new" className={buttonVariants({ size: "lg" })}>
          New order
        </Link>
      </header>

      <FilterBar search={search} onPatch={patch} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium">URL</h2>
        <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm">{href}</pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Gridify query</h2>
        <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm">
          {JSON.stringify(gridifyQuery, null, 2)}
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
                <code className="min-w-0 break-all">{entry.query}</code>
              </li>
            ))
          )}
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">
          Orders{" "}
          <span className="text-muted-foreground">
            (sorted + paged by the mock — the filter is not applied)
          </span>
        </h2>
        <OrdersTable
          orders={orders}
          sorting={search.sort ?? NO_SORT}
          pagination={{
            pageIndex: (search.page ?? 1) - 1,
            pageSize: search.pageSize ?? DEFAULT_PAGE_SIZE,
          }}
          onSortingChange={(sort) => patch({ sort: sort.length > 0 ? sort : undefined })}
          onPaginationChange={({ pageIndex, pageSize }) =>
            void navigate({
              search: (prev) => ({
                ...prev,
                page: pageIndex > 0 ? pageIndex + 1 : undefined,
                pageSize: pageSize === DEFAULT_PAGE_SIZE ? undefined : pageSize,
              }),
            })
          }
        />
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
