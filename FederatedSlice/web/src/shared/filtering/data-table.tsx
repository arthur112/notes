import type { ReactNode } from "react";
import {
  functionalUpdate,
  metaHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
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
import { cn } from "@/shared/lib/utils";

import type { CommonSearch } from "./definition";

/**
 * The server-side table shared by every filtered list. `manualSorting` +
 * `manualPagination` tell TanStack Table that `data` is already the sorted
 * page; the table only holds the state and reports its next value. The
 * entity supplies its columns (built with `filterTableFeatures`) and labels.
 *
 * v9 registers features explicitly; no sorted / paginated row models, since
 * nothing is sorted or sliced in the browser.
 */
export const filterTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnMeta: metaHelper<{ className?: string }>(),
});

export type FilterColumn<TData extends RowData> = ColumnDef<typeof filterTableFeatures, TData, any>;

export type PagedResult<TData> = {
  count: number;
  data: TData[];
};

/** The subset of a React Query result the table and diagnostics need. */
export type PagedQueryResult<TData> = {
  data: PagedResult<TData> | undefined;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  error: Error | null;
};

export type DataTableProps<TData extends RowData> = {
  /** Module-scope columns (`filterTableFeatures` must be their feature set). */
  columns: FilterColumn<TData>[];
  result: PagedQueryResult<TData>;
  /** The settled search: sorting and pagination are read from it. */
  search: CommonSearch;
  /**
   * The next sort or page, as search keys. A sort patch has no `page`, so the
   * page's patch sends it back to page 1; a pagination patch always sets it.
   */
  onPatch: (changes: CommonSearch) => void;
  /** The first one is the default, kept out of the URL. */
  pageSizes: readonly number[];
  /** Plural noun for the footer, e.g. "orders". */
  itemsLabel: string;
  emptyMessage: string;
  /** Prefix for the error row, e.g. "Could not load orders". */
  errorLabel: string;
};

const NO_ROWS: never[] = [];
const NO_SORT: SortingState = [];

/** Header click sorts (Shift+click adds a column), the footer pages. */
export function DataTable<TData extends RowData>({
  columns,
  result,
  search,
  onPatch,
  pageSizes,
  itemsLabel,
  emptyMessage,
  errorLabel,
}: DataTableProps<TData>) {
  const defaultPageSize = pageSizes[0];
  const sorting = search.sort ?? NO_SORT;
  const pagination: PaginationState = {
    pageIndex: (search.page ?? 1) - 1,
    pageSize: search.pageSize ?? defaultPageSize,
  };

  const table = useTable<typeof filterTableFeatures, TData>({
    features: filterTableFeatures,
    columns,
    data: result.data?.data ?? NO_ROWS,
    rowCount: result.data?.count,
    manualSorting: true,
    manualPagination: true,
    state: { sorting, pagination },
    onSortingChange: (updater) => {
      const sort = functionalUpdate(updater, sorting);
      onPatch({ sort: sort.length > 0 ? sort : undefined });
    },
    // Page 1 and the default page size stay out of the URL, so `/orders` and
    // `/orders?page=1` are one cache entry.
    onPaginationChange: (updater) => {
      const { pageIndex, pageSize } = functionalUpdate(updater, pagination);
      onPatch({
        page: pageIndex > 0 ? pageIndex + 1 : undefined,
        pageSize: pageSize === defaultPageSize ? undefined : pageSize,
      });
    },
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-2">
      <div
        aria-busy={result.isFetching}
        className={cn(
          "overflow-x-auto rounded-lg border transition-opacity",
          result.isFetching && "opacity-60",
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
            {result.isPending ? (
              <MessageRow columns={columns.length}>Loading…</MessageRow>
            ) : result.isError ? (
              <MessageRow columns={columns.length} className="text-destructive">
                {errorLabel}: {result.error?.message ?? "Unknown error"}
              </MessageRow>
            ) : rows.length === 0 ? (
              <MessageRow columns={columns.length}>{emptyMessage}</MessageRow>
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
          {pageSizes.map((size) => (
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
            {table.getRowCount()} {itemsLabel}
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

function MessageRow({
  columns,
  className,
  children,
}: {
  columns: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={columns} className={cn("px-4 py-3 text-muted-foreground", className)}>
        {children}
      </td>
    </tr>
  );
}
