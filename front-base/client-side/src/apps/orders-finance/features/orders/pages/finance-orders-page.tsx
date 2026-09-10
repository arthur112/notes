import { useCallback, useMemo, useState } from "react";
import {
  useTable,
  type ColumnVisibilityState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { Activity, Inbox, SearchX } from "lucide-react";

import { ActiveFilters } from "@/shared/components/filters/active-filters";
import { ColumnsMenu, DensityToggle, ResultsSummary } from "@/shared/components/table-tools";
import type { TableDensity } from "@/shared/components/data-table";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/ui/page-header";
import { PaginationBar } from "@/shared/components/ui/pagination-bar";
import { MonthPicker } from "@/shared/components/ui/month-picker";
import { ErrorPanel, TableEmpty, TableSkeleton } from "@/shared/components/ui/data-states";
import { dataTableFeatures, DataTable } from "@/shared/components/data-table";
import {
  buildPageQuery,
  STATUS_META,
  StatusPills,
  useOrderTotals,
  useOrdersPage,
} from "@/shared/domain/orders";
import { formatMonth, type Month } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";

import { CrossAppActivity } from "../components/cross-app-activity";
import { buildFinanceColumns } from "../ui/finance-columns";
import { FinanceSummaryCards } from "../ui/summary-cards";
import {
  DEFAULT_FINANCE_FILTERS,
  isFinanceDefault,
  toFinanceConditions,
  type FinanceStatus,
} from "../types/finance-orders-filters";

const PAGE_SIZE_OPTIONS = [25, 50, 100];
/** Net + VAT live in the summary cards, so they start hidden and Total fits. */
const DEFAULT_HIDDEN_COLUMNS: ColumnVisibilityState = { subtotal: false, tax: false };

/**
 * Orders · Finance — the second app over the same orders business. A lean
 * read-only view: one month control, the shared status pills, aggregate cards
 * and a fiscal table. It shares the table-tool contract (scope line, column
 * chooser, density, pagination) with Ops while sharing none of its columns.
 */
export function FinanceOrdersPage() {
  const [filters, setFilters] = useState(DEFAULT_FINANCE_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [sorting, setSorting] = useState<SortingState>([{ id: "dueDate", desc: false }]);
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>(DEFAULT_HIDDEN_COLUMNS);
  const [density, setDensity] = useState<TableDensity>("comfortable");
  const [showActivity, setShowActivity] = useState(false);

  const patchFilters = useCallback((patch: Partial<typeof filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FINANCE_FILTERS);
    setPage(1);
  }, []);

  const setMonth = useCallback((month: Month | null) => patchFilters({ month }), [patchFilters]);

  const conditions = useMemo(() => toFinanceConditions(filters), [filters]);
  const orderBy = useMemo(
    () => (sorting[0] ? `${sorting[0].id}${sorting[0].desc ? " desc" : ""}, id desc` : "id desc"),
    [sorting],
  );

  const pageQuery = useMemo(
    () => buildPageQuery({ page, pageSize, orderBy, conditions }),
    [page, pageSize, orderBy, conditions],
  );
  const filterString = useMemo(() => pageQuery.filter, [pageQuery.filter]);

  const orders = useOrdersPage(pageQuery);
  const totals = useOrderTotals(filterString);

  const columns = useMemo(() => buildFinanceColumns(), []);

  const onSortingChange = useCallback((updater: Updater<SortingState>) => {
    setSorting((current) => (typeof updater === "function" ? updater(current) : updater));
    setPage(1);
  }, []);

  const table = useTable(
    {
      features: dataTableFeatures,
      columns,
      data: orders.data?.data ?? [],
      state: { sorting, columnVisibility },
      onSortingChange,
      onColumnVisibilityChange: setColumnVisibility,
      manualSorting: true,
    },
    (state) => state,
  );

  const periodLabel = filters.month
    ? formatMonth(filters.month)
    : filters.status === "all"
      ? "all time"
      : STATUS_META[filters.status].label;
  const activeFilterCount = (filters.month ? 1 : 0) + (filters.status === "all" ? 0 : 1);
  const noFilters = isFinanceDefault(filters);
  const count = orders.data?.count ?? 0;
  const isLoadingFirstPage = orders.isPending && orders.data === undefined;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders · Finance"
        description="A read-only fiscal view of the same orders: month + status, aggregate cards and Net/VAT/Total."
      />

      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center gap-2 p-3">
          <MonthPicker
            value={filters.month}
            onChange={setMonth}
            ariaLabel="Month"
            className="h-9 w-44"
          />
          <StatusPills
            value={filters.status === "all" ? [] : [filters.status]}
            onChange={(next) => patchFilters({ status: (next[0] as FinanceStatus) ?? "all" })}
            ariaLabel="Status filter"
          />
          <div className="flex items-center gap-2 sm:ml-auto">
            <Button
              variant={showActivity ? "secondary" : "outline"}
              size="sm"
              aria-pressed={showActivity}
              onClick={() => setShowActivity((value) => !value)}
            >
              <Activity />
              Activity
            </Button>
            <ColumnsMenu table={table} />
            <DensityToggle value={density} onChange={setDensity} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t px-3 py-2">
          <ResultsSummary
            count={count}
            noun="order"
            activeFilterCount={activeFilterCount}
            busy={orders.isFetching}
          />
          <ActiveFilters filters={[]} onClearAll={resetFilters} activeCount={activeFilterCount} />
        </div>
      </div>

      <FinanceSummaryCards
        totals={totals.data}
        isPending={totals.isPending}
        periodLabel={periodLabel}
      />

      <div className={cn("grid gap-4", showActivity && "xl:grid-cols-[1fr_320px]")}>
        <div className="min-w-0 rounded-lg border bg-card">
          {isLoadingFirstPage ? (
            <div className="p-4">
              <TableSkeleton rows={10} cols={7} />
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
                empty={
                  <TableEmpty
                    icon={noFilters ? <Inbox className="size-5" /> : <SearchX className="size-5" />}
                    title={noFilters ? "No orders yet" : "No orders for this period"}
                    description={
                      noFilters
                        ? "Seed data appears here once the period is set."
                        : "Pick another month or widen the status filter."
                    }
                    action={
                      !noFilters && (
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
                  <PaginationBar
                    page={page}
                    totalPages={orders.data?.totalPages ?? 1}
                    count={count}
                    pageSize={pageSize}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    onPageChange={setPage}
                    onPageSizeChange={(next) => {
                      setPageSize(next);
                      setPage(1);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {showActivity && (
          <div className="self-start">
            <CrossAppActivity />
          </div>
        )}
      </div>
    </div>
  );
}
