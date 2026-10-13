import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  createColumnHelper,
  functionalUpdate,
  metaHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { formatDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import type { Order, OrdersResponse } from "./api/orders-api";
import { PAGE_SIZES } from "./filter";

/**
 * TanStack Table v9, server-side: the features are registered for their state
 * and APIs only (no sorted / paginated row model), and `manualSorting` +
 * `manualPagination` tell the table that `data` is already the sorted page.
 * Features, columns and the empty fallback live at module scope so their
 * references stay stable.
 */
const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnMeta: metaHelper<{ className?: string }>(),
});

const helper = createColumnHelper<typeof features, Order>();

/** The column ids are the sort keys of the URL (`SORT_FIELDS` in `filter.ts`). */
const columns = helper.columns([
  helper.accessor("orderNo", {
    header: "Order",
    cell: ({ getValue }) => (
      <Link
        to="/orders/$orderNo/edit"
        params={{ orderNo: getValue() }}
        className="font-medium underline-offset-4 hover:underline"
      >
        {getValue()}
      </Link>
    ),
  }),
  helper.accessor("customer", { header: "Customer" }),
  helper.accessor("status", { header: "Status", meta: { className: "capitalize" } }),
  helper.accessor("createdAt", {
    header: "Created",
    cell: ({ getValue }) => formatDate(getValue()),
    meta: { className: "tabular-nums" },
  }),
  helper.accessor("total", {
    header: "Total",
    cell: ({ getValue }) => getValue().toFixed(2),
    meta: { className: "text-right tabular-nums" },
  }),
]);

const NO_ORDERS: Order[] = [];

export type OrdersTableProps = {
  orders: UseQueryResult<OrdersResponse>;
  /** Controlled from the URL; each change is reported as the next value. */
  sorting: SortingState;
  pagination: PaginationState;
  onSortingChange: (sorting: SortingState) => void;
  onPaginationChange: (pagination: PaginationState) => void;
};

/**
 * Header click sorts (Shift+click adds a column to the sort), the footer pages.
 * The table owns no state: it reads `sorting` / `pagination` and reports the
 * next value, which the page writes to the URL.
 */
export function OrdersTable({
  orders,
  sorting,
  pagination,
  onSortingChange,
  onPaginationChange,
}: OrdersTableProps) {
  const table = useTable({
    features,
    columns,
    data: orders.data?.data ?? NO_ORDERS,
    rowCount: orders.data?.count,
    manualSorting: true,
    manualPagination: true,
    state: { sorting, pagination },
    onSortingChange: (updater) => onSortingChange(functionalUpdate(updater, sorting)),
    onPaginationChange: (updater) => onPaginationChange(functionalUpdate(updater, pagination)),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-2">
      <div
        aria-busy={orders.isFetching}
        className={cn(
          "overflow-x-auto rounded-lg border transition-opacity",
          orders.isFetching && "opacity-60",
        )}
      >
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const SortIcon =
                    sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;
                  return (
                    <th
                      key={header.id}
                      aria-sort={
                        sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"
                      }
                      className={cn(
                        "px-4 py-2 font-medium",
                        header.column.columnDef.meta?.className,
                      )}
                    >
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "inline-flex items-center gap-1 hover:text-foreground",
                          sorted && "text-foreground",
                        )}
                      >
                        <table.FlexRender header={header} />
                        <SortIcon className={cn("size-3.5", !sorted && "opacity-40")} />
                        {sorted && sorting.length > 1 && (
                          <span className="tabular-nums">{header.column.getSortIndex() + 1}</span>
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {orders.isPending ? (
              <MessageRow>Loading…</MessageRow>
            ) : orders.isError ? (
              <MessageRow className="text-destructive">
                Could not load orders: {orders.error.message}
              </MessageRow>
            ) : rows.length === 0 ? (
              <MessageRow>No orders on this page.</MessageRow>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn("px-4 py-2", cell.column.columnDef.meta?.className)}
                    >
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          Rows per page
          {PAGE_SIZES.map((size) => (
            <Button
              key={size}
              size="sm"
              variant={size === pagination.pageSize ? "secondary" : "ghost"}
              aria-pressed={size === pagination.pageSize}
              onClick={() => table.setPageSize(size)}
            >
              {size}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2 text-muted-foreground tabular-nums">
            Page {pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)} ·{" "}
            {table.getRowCount()} orders
          </span>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="First page"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.firstPage()}
          >
            <ChevronsLeft />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Previous page"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Next page"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Last page"
            disabled={!table.getCanLastPage()}
            onClick={() => table.lastPage()}
          >
            <ChevronsRight />
          </Button>
        </div>
      </footer>
    </div>
  );
}

function MessageRow({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={columns.length} className={cn("px-4 py-3 text-muted-foreground", className)}>
        {children}
      </td>
    </tr>
  );
}
