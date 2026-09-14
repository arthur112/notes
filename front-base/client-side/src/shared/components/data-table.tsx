import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  type ColumnDef,
  type Header,
  type ReactTable,
  type Row,
  type RowData,
} from "@tanstack/react-table";

import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Table as TablePrimitive,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/utils";

/** Comfortable = roomier two-line identity; compact = dense order desk. */
export type TableDensity = "comfortable" | "compact";

/**
 * Per-column presentation hints, typed through the `columnMeta` feature slot so
 * `columnDef.meta` is not `unknown`. This is what lets the renderer honour grid
 * conventions (right-aligned numbers) instead of leaving alignment to each cell.
 */
export type DataColumnMeta = {
  align?: "left" | "center" | "right";
  /** Human label for the columns menu (defaults to a string header). */
  label?: string;
  cellClassName?: string;
  headerClassName?: string;
  /** Never hidden and never listed in the columns menu (e.g. the checkbox). */
  locked?: boolean;
};

/**
 * The shared v9 feature set. Sorting, row selection, pagination and column
 * visibility are registered explicitly (v9 has no global feature APIs).
 *
 * Every app is server-driven: with `manualSorting` / `manualPagination` the
 * features own *state and navigation APIs only* — they never transform rows.
 * No `paginatedRowModel` factory is registered, so `getRowModel()` resolves to
 * the pre-paginated model and paging happens in the Gridify query string.
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  rowSelectionFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    text: sortFn_text,
    alphanumeric: sortFn_alphanumeric,
    datetime: sortFn_datetime,
    basic: sortFn_basic,
  },
  columnMeta: {} as DataColumnMeta,
});

export type DataTableFeatures = typeof dataTableFeatures;

export function createDataColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}

/**
 * The leading checkbox column. Pinned `locked` so it can never be hidden from
 * the columns menu and never renders a sort button around its checkbox.
 */
export function selectionColumn<TData extends RowData>(): ColumnDef<DataTableFeatures, TData> {
  return {
    id: "select",
    enableSorting: false,
    enableHiding: false,
    meta: { locked: true, align: "center", label: "Select" },
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all rows on this page"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
      />
    ),
    cell: ({ row }) => (
      <span
        className="flex items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        <Checkbox
          aria-label={`Select order ${row.id}`}
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(checked)}
        />
      </span>
    ),
  };
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <ArrowUp className="size-3.5" />;
  if (direction === "desc") return <ArrowDown className="size-3.5" />;
  return <ArrowUpDown className="size-3.5 opacity-0 group-hover/header:opacity-60" />;
}

function HeaderCell<TData extends RowData>({
  table,
  header,
  sortable,
  stickyHeader,
}: {
  table: ReactTable<DataTableFeatures, TData>;
  header: Header<DataTableFeatures, TData, unknown>;
  sortable: boolean;
  stickyHeader: boolean;
}) {
  const sortState = header.column.getIsSorted();
  const meta = header.column.columnDef.meta;
  const align = meta?.align ?? "left";
  const content = header.isPlaceholder ? null : <table.FlexRender header={header} />;

  const sortTitle = (() => {
    if (!sortable) return undefined;
    const next = header.column.getNextSortingOrder();
    if (next === "asc") return "Sort ascending";
    if (next === "desc") return "Sort descending";
    return "Clear sort";
  })();

  return (
    <TableHead
      colSpan={header.colSpan}
      aria-sort={
        sortState === "asc" ? "ascending" : sortState === "desc" ? "descending" : undefined
      }
      className={cn(
        align === "center" && "text-center",
        align === "right" && "text-right",
        sortState !== false && "text-foreground",
        stickyHeader && "sticky top-0 z-10 bg-card",
        meta?.headerClassName,
      )}
    >
      {sortable ? (
        <button
          type="button"
          onClick={header.column.getToggleSortingHandler()}
          title={sortTitle}
          className={cn(
            "group/header flex w-full cursor-pointer items-center gap-1.5 select-none hover:text-foreground",
            align === "right" && "justify-end",
            align === "center" && "justify-center",
          )}
        >
          <span className="truncate">{content}</span>
          <span
            className={cn(
              "shrink-0 text-muted-foreground",
              sortState !== false && "text-primary opacity-100",
            )}
          >
            <SortIcon direction={sortState} />
          </span>
        </button>
      ) : (
        <span
          className={cn(
            "flex items-center",
            align === "right" && "justify-end",
            align === "center" && "justify-center",
          )}
        >
          {content}
        </span>
      )}
    </TableHead>
  );
}

export type DataTableProps<TData extends RowData> = {
  table: ReactTable<DataTableFeatures, TData>;
  onRowClick?: (row: Row<DataTableFeatures, TData>) => void;
  /** Hide the sortable-header affordance (e.g. for read-only galleries). */
  disableSorting?: boolean;
  density?: TableDensity;
  /**
   * A refetch is in flight. Rows stay mounted, dim, and the table is marked
   * `aria-busy` — the pagination and header never unmount.
   */
  busy?: boolean;
  /** Rendered inside the table body when there are no rows. */
  empty?: ReactNode;
  /** Own scroll container + sticky header (for long or wide tables). */
  stickyHeader?: boolean;
};

/** Dumb renderer for a v9 table instance. */
export function DataTable<TData extends RowData>({
  table,
  onRowClick,
  disableSorting = false,
  density = "comfortable",
  busy = false,
  empty,
  stickyHeader = false,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const columnCount = table.getVisibleLeafColumns().length;
  const compact = density === "compact";

  return (
    <TablePrimitive
      aria-busy={busy}
      data-density={density}
      containerClassName={stickyHeader ? "max-h-[72svh] overflow-auto" : "overflow-x-auto"}
    >
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="hover:bg-transparent">
            {headerGroup.headers.map((header) => (
              <HeaderCell
                key={header.id}
                table={table}
                header={header}
                sortable={!disableSorting && header.column.getCanSort()}
                stickyHeader={stickyHeader}
              />
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody className={cn(busy && "opacity-60 transition-opacity")}>
        {rows.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={columnCount} className="p-0">
              {empty}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn("group/row align-middle", onRowClick && "cursor-pointer")}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta;
                const align = meta?.align ?? "left";
                return (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      compact ? "py-1.5" : "py-2.5",
                      align === "center" && "text-center",
                      align === "right" && "text-right",
                      meta?.cellClassName,
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                );
              })}
            </TableRow>
          ))
        )}
      </TableBody>
    </TablePrimitive>
  );
}
