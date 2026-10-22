import { useSyncExternalStore } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";

import { buttonVariants } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/filtering/data-table";
import { FilterBar } from "@/shared/filtering/filter-bar";
import { FilterDiagnostics } from "@/shared/filtering/filter-diagnostics";
import { FilterPage } from "@/shared/filtering/filter-page";

import { getRequestLog, subscribeRequestLog } from "./api/orders-api";
import { useOrders } from "./api/use-orders";
import { ordersFilter, type OrdersSearchInput } from "./filter";
import { ORDER_COLUMNS } from "./orders-columns";

const routeApi = getRouteApi("/orders/");

/**
 * Smart page. The URL is the only filter state: the controls read it, each
 * patch is a navigation, and the route loader + `useOrders` fetch from it.
 * Back/Forward therefore needs no code. The debounce lives in the typed
 * controls (`FilterBar`), not here.
 */
export function OrdersPage() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const orders = useOrders(search);
  const log = useSyncExternalStore(subscribeRequestLog, getRequestLog);

  // Each patch is a history entry, so Back undoes a filter. It applies to the
  // current search, not this render's, since a debounced patch can land later.
  // A new filter or order starts again at page 1; only a pagination patch,
  // which sets `page` itself, overrides that.
  const patch = (changes: OrdersSearchInput) =>
    void navigate({ search: (prev) => ({ ...prev, page: undefined, ...changes }) });

  return (
    <FilterPage
      title="Orders"
      description="Filter controls (typed fields debounced) → URL search → route loader + React Query → mock API."
      action={
        <Link to="/orders/new" className={buttonVariants({ size: "lg" })}>
          New order
        </Link>
      }
    >
      <FilterBar
        definition={ordersFilter}
        search={search}
        onPatch={patch}
        onClear={() => patch(ordersFilter.cleared)}
      />

      <FilterDiagnostics
        definition={ordersFilter}
        search={search}
        log={log}
        isFetching={orders.isFetching}
        isError={orders.isError}
      >
        <section className="space-y-2">
          <h2 className="text-sm font-medium">
            Orders{" "}
            <span className="text-muted-foreground">
              (sorted + paged by the mock — the filter is not applied)
            </span>
          </h2>
          <DataTable
            columns={ORDER_COLUMNS}
            result={orders}
            search={search}
            onPatch={patch}
            pageSizes={ordersFilter.pageSizes}
            itemsLabel="orders"
            emptyMessage="No orders on this page."
            errorLabel="Could not load orders"
          />
        </section>
      </FilterDiagnostics>
    </FilterPage>
  );
}
