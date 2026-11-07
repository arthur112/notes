import { useSyncExternalStore, type ReactNode } from "react";

import type { Order } from "@/api/orders";
import { DataTable, type FilterColumn } from "@/shared/filtering/data-table";
import { FilterBar } from "@/shared/filtering/filter-bar";
import { FilterDiagnostics } from "@/shared/filtering/filter-diagnostics";
import { FilterPage } from "@/shared/filtering/filter-page";

import { getRequestLog, subscribeRequestLog } from "@/api/orders";
import { useOrders } from "./use-orders";
import { ordersFilter, type OrdersSearch, type OrdersSearchInput } from "./filter";

/**
 * The orders list, for any app. The URL is the only filter state, but the
 * route belongs to the app, so the app's page reads it and passes `search` +
 * `onPatch` (a navigation, see `patchSearch`). The app also picks the columns
 * and the header action. Back/Forward needs no code; the debounce lives in
 * the typed controls (`FilterBar`).
 */
export function OrdersList({
  search,
  onPatch: patch,
  columns,
  action,
}: {
  search: OrdersSearch;
  onPatch: (changes: OrdersSearchInput) => void;
  columns: FilterColumn<Order>[];
  action?: ReactNode;
}) {
  const orders = useOrders(search);
  const log = useSyncExternalStore(subscribeRequestLog, getRequestLog);

  return (
    <FilterPage
      title="Orders"
      description="Filter controls (typed fields debounced) → URL search → route loader + React Query → mock API."
      action={action}
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
            columns={columns}
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
