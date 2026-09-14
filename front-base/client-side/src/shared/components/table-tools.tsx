import type { ReactNode } from "react";
import type { Column, ReactTable, RowData } from "@tanstack/react-table";
import { Columns3, Loader2, Rows3, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { PaginationBar } from "@/shared/components/ui/pagination-bar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Separator } from "@/shared/components/ui/separator";
import type { DataTableFeatures, TableDensity } from "@/shared/components/data-table";
import { cn } from "@/shared/lib/utils";

export type { TableDensity };

/**
 * The persistent scope line. `role="status"` + `aria-live="polite"` so a screen
 * reader hears the new count once the response settles — the count is the thing
 * the user actually filters against, yet it used to live 25 rows below in the
 * footer.
 */
export function ResultsSummary({
  count,
  noun,
  activeFilterCount = 0,
  busy = false,
  className,
}: {
  count: number;
  noun: string;
  activeFilterCount?: number;
  busy?: boolean;
  className?: string;
}) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}
    >
      {busy && <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />}
      <span className="font-medium text-foreground tabular-nums">{count.toLocaleString()}</span>
      <span>
        {noun}
        {count === 1 ? "" : "s"}
      </span>
      {activeFilterCount > 0 && (
        <>
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}
          </span>
        </>
      )}
    </p>
  );
}

/** Comfortable (two-line identity, roomier) vs. compact (dense order desk). */
export function DensityToggle({
  value,
  onChange,
}: {
  value: TableDensity;
  onChange: (next: TableDensity) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon" aria-label="Row density" />}
      >
        <Rows3 />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Row density</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(next) => onChange(next as TableDensity)}
          >
            <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function columnLabel<TData extends RowData>(
  column: Column<DataTableFeatures, TData, unknown>,
): string {
  const metaLabel = column.columnDef.meta?.label;
  if (metaLabel) return metaLabel;
  const header = column.columnDef.header;
  return typeof header === "string" ? header : column.id;
}

/**
 * Column chooser. Columns flagged `meta.locked` (the selection checkbox) never
 * appear; every other leaf column can be hidden. This is what lets Finance drop
 * Net/VAT from the default view and fit Total on screen.
 */
export function ColumnsMenu<TData extends RowData>({
  table,
}: {
  table: ReactTable<DataTableFeatures, TData>;
}) {
  const columns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide() && !column.columnDef.meta?.locked);

  if (columns.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon" aria-label="Show or hide columns" />}
      >
        <Columns3 />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {columns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(checked) => column.toggleVisibility(checked === true)}
            >
              {columnLabel(column)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Replaces the toolbar while rows are selected so the bulk affordances own the
 * row instead of competing with the filters.
 */
export function SelectionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium tabular-nums">{count} selected</span>
      <Separator orientation="vertical" className="h-5" />
      {children}
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onClear}>
        <X />
        Clear selection
      </Button>
    </div>
  );
}

/**
 * Pagination driven by the table's `rowPaginationFeature`. The page owns the
 * `pagination` slice (it has to build the query before the table exists) and
 * feeds it back through `useTable`; this reads it back out and routes every
 * navigation through the feature's own APIs, so there is one source of truth.
 * The `PaginationBar` it renders stays a dumb, controlled component.
 */
export function TablePagination<TData extends RowData>({
  table,
  pageSizeOptions,
  onNavigate,
}: {
  table: ReactTable<DataTableFeatures, TData>;
  pageSizeOptions?: number[];
  /** Runs after a page or page-size change (e.g. to drop a stale row selection). */
  onNavigate?: () => void;
}) {
  const { pageIndex, pageSize } = table.state.pagination;

  return (
    <PaginationBar
      page={pageIndex + 1}
      // A manual page count can still be 0 before the first response settles.
      totalPages={Math.max(table.getPageCount(), 1)}
      count={table.getRowCount()}
      pageSize={pageSize}
      pageSizeOptions={pageSizeOptions}
      onPageChange={(next) => {
        table.setPageIndex(next - 1);
        onNavigate?.();
      }}
      onPageSizeChange={(next) => {
        // Return to the first page so a smaller page size never lands past the end.
        table.setPagination((current) => ({ ...current, pageIndex: 0, pageSize: next }));
        onNavigate?.();
      }}
    />
  );
}
