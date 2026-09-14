import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useTable,
  type ColumnVisibilityState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { Download, Inbox, PackageCheck, Plus, SearchX } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { ErrorPanel, TableEmpty, TableSkeleton } from "@/shared/components/ui/data-states";
import { TablePagination } from "@/shared/components/table-tools";
import { dataTableFeatures, DataTable, selectionColumn } from "@/shared/components/data-table";
import type { TableDensity } from "@/shared/components/data-table";
import {
  CHANNEL_LABELS,
  STATUS_META,
  buildPageQuery,
  useOrdersPage,
  useSetOrderStatusMutation,
  type Order,
  type OrderStatus,
} from "@/shared/domain/orders";
import { useDebouncedValue } from "@/shared/hooks/use-debounce";
import { useShell } from "@/shell/ShellProvider";

import { OrderCreateSheet } from "../../order-create/components/order-create-sheet";
import { OpsToolbar } from "../ui/ops-toolbar";
import { buildOpsColumns } from "../ui/ops-columns";
import {
  DEFAULT_OPS_FILTERS,
  isOpsFiltersDefault,
  toOpsConditions,
  type OpsFilters,
} from "../types/ops-orders-filters";

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const EMPTY_ORDERS: Order[] = [];

const CHANNEL_OPTIONS = Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label }));

function ordersToCsv(orders: Order[]): string {
  const header = ["Order", "Customer", "Country", "Channel", "Status", "Created", "Due", "Total"];
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = orders.map((order) =>
    [
      order.orderNo,
      order.customer.name,
      order.customer.country,
      CHANNEL_LABELS[order.channel],
      STATUS_META[order.status].label,
      order.createdAt,
      order.dueDate,
      order.total,
    ]
      .map(cell)
      .join(","),
  );
  return [header.map(cell).join(","), ...lines].join("\n");
}

/**
 * Orders · Ops — one of two apps over the same orders business. A dense desk
 * toolbar (persistent search + status pills, everything else behind one
 * labelled Filters popover), a scope line that states the result count, bulk
 * selection, and a detail drawer with status changes.
 */
export function OpsOrdersPage() {
  const { publish } = useShell();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<OpsFilters>(DEFAULT_OPS_FILTERS);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE_OPTIONS[0],
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [density, setDensity] = useState<TableDensity>("comfortable");
  const [createOpen, setCreateOpen] = useState(false);

  const debouncedQuery = useDebouncedValue(filters.query, 350);
  const setStatus = useSetOrderStatusMutation();

  // Any change to what the page shows invalidates a selection made on the old page.
  const resetPage = useCallback(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, []);

  const clearSelection = useCallback(() => setRowSelection({}), []);

  const patchFilters = useCallback(
    (patch: Partial<OpsFilters>) => {
      setFilters((current) => ({ ...current, ...patch }));
      resetPage();
      setRowSelection({});
    },
    [resetPage],
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_OPS_FILTERS);
    resetPage();
    setRowSelection({});
  }, [resetPage]);

  const handleOpen = useCallback(
    (order: Order) => {
      publish("orders-ops", `Opened ${order.orderNo} (${order.customer.name})`);
      void navigate({ to: "/apps/orders-ops/$orderNo", params: { orderNo: order.orderNo } });
    },
    [navigate, publish],
  );

  const handleSetStatus = useCallback(
    (order: Order, status: OrderStatus) => {
      setStatus.mutate({ id: order.id, status });
      publish("orders-ops", `Marked ${order.orderNo} as ${STATUS_META[status].label}`);
    },
    [publish, setStatus],
  );

  const columns = useMemo(
    () => [
      selectionColumn<Order>(),
      ...buildOpsColumns({ onOpen: handleOpen, onSetStatus: handleSetStatus }),
    ],
    [handleOpen, handleSetStatus],
  );

  const conditions = useMemo(
    () => toOpsConditions(filters, debouncedQuery),
    [filters, debouncedQuery],
  );
  // A deterministic tiebreaker keeps offset paging from repeating/skipping rows.
  const orderBy = useMemo(
    () => (sorting[0] ? `${sorting[0].id}${sorting[0].desc ? " desc" : ""}, id desc` : "id desc"),
    [sorting],
  );

  const pageQuery = useMemo(
    () =>
      buildPageQuery({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        orderBy,
        conditions,
      }),
    [pagination, orderBy, conditions],
  );

  const orders = useOrdersPage(pageQuery);

  const onSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      setSorting((current) => (typeof updater === "function" ? updater(current) : updater));
      resetPage();
      setRowSelection({});
    },
    [resetPage],
  );

  const table = useTable(
    {
      features: dataTableFeatures,
      columns,
      data: orders.data?.data ?? EMPTY_ORDERS,
      state: { sorting, pagination, columnVisibility, rowSelection },
      onSortingChange,
      onPaginationChange: setPagination,
      onColumnVisibilityChange: setColumnVisibility,
      onRowSelectionChange: setRowSelection,
      manualSorting: true,
      manualPagination: true,
      rowCount: orders.data?.count,
      getRowId: (row: Order) => row.orderNo,
    },
    (state) => state,
  );

  const selectedOrders = useMemo(
    () => table.getSelectedRowModel().rows.map((row) => row.original),
    // Recompute when the selection or the page's data changes.
    [table, rowSelection, orders.data],
  );

  const bulkSetStatus = useCallback(
    (status: OrderStatus) => {
      for (const order of selectedOrders) setStatus.mutate({ id: order.id, status });
      publish(
        "orders-ops",
        `Marked ${selectedOrders.length} order${selectedOrders.length === 1 ? "" : "s"} as ${STATUS_META[status].label}`,
      );
      setRowSelection({});
    },
    [selectedOrders, setStatus, publish],
  );

  const exportSelected = useCallback(() => {
    const blob = new Blob([ordersToCsv(selectedOrders)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `orders-selection-${selectedOrders.length}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    publish("orders-ops", `Exported ${selectedOrders.length} orders to CSV`);
  }, [selectedOrders, publish]);

  const noFilters = isOpsFiltersDefault(filters);
  const count = orders.data?.count ?? 0;
  const isLoadingFirstPage = orders.isPending && orders.data === undefined;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders · Ops"
        description="Dense order desk — server-side filtering, sorting and paging over the shared orders contract."
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          New order
        </Button>
      </PageHeader>

      <OpsToolbar
        filters={filters}
        onPatch={patchFilters}
        onReset={resetFilters}
        channelOptions={CHANNEL_OPTIONS}
        count={count}
        busy={orders.isFetching}
        table={table}
        density={density}
        onDensityChange={setDensity}
        selectionCount={selectedOrders.length}
        onClearSelection={clearSelection}
        bulkActions={
          <>
            <Button variant="outline" size="sm" onClick={() => bulkSetStatus("shipped")}>
              <PackageCheck />
              Mark shipped
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkSetStatus("delivered")}>
              Mark delivered
            </Button>
            <Button variant="outline" size="sm" onClick={exportSelected}>
              <Download />
              Export CSV
            </Button>
          </>
        }
      />

      <div className="rounded-lg border bg-card">
        {isLoadingFirstPage ? (
          <div className="p-4">
            <TableSkeleton rows={8} cols={7} />
          </div>
        ) : orders.isError ? (
          <ErrorPanel
            title="Could not load orders"
            description="The mock API did not answer. Try again."
            onRetry={() => orders.refetch()}
          />
        ) : (
          <>
            <DataTable
              table={table}
              busy={orders.isFetching}
              density={density}
              stickyHeader
              onRowClick={(row) => handleOpen(row.original)}
              empty={
                <TableEmpty
                  icon={noFilters ? <Inbox className="size-5" /> : <SearchX className="size-5" />}
                  title={noFilters ? "No orders yet" : "No orders match these filters"}
                  description={
                    noFilters
                      ? "Create the first order to see it appear here."
                      : "Loosen or clear some filters to see more of the seeded orders."
                  }
                  action={
                    noFilters ? (
                      <Button size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus />
                        New order
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        Clear all filters
                      </Button>
                    )
                  }
                />
              }
            />
            {count > 0 && (
              <div className="border-t px-4 py-3">
                <TablePagination
                  table={table}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onNavigate={clearSelection}
                />
              </div>
            )}
          </>
        )}
      </div>

      <OrderCreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
