import { useCallback, useState } from "react";
import { useTable, type SortingState, type Updater } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Database, RotateCcw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { EmptyState, ErrorPanel, TableSkeleton } from "@/shared/components/ui/data-states";
import {
  dataTableFeatures,
  DataTable,
  createDataColumnHelper,
} from "@/shared/components/data-table";
import { formatCurrency } from "@/shared/lib/format";
import { formatMonth } from "@/shared/lib/date";
import type { SampleProject } from "../types/gallery-sample";
import { SAMPLE_PROJECTS } from "../types/gallery-sample";

const helper = createDataColumnHelper<SampleProject>();

const columns: ColumnDef<typeof dataTableFeatures, SampleProject>[] = helper.columns([
  helper.accessor("name", { header: "Project" }),
  helper.accessor("owner", { header: "Owner" }),
  helper.accessor((row) => `${row.month.year}-${row.month.month}`, {
    id: "month",
    header: "Month",
    cell: (info) => formatMonth(info.row.original.month),
  }),
  helper.accessor("budget", {
    header: "Budget",
    cell: (info) => formatCurrency(info.getValue()),
  }),
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** DataTable with client-side sorting + the loading/empty/error state pattern. */
export function TableGallery() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"data" | "empty" | "error">("data");

  const simulate = useCallback(async (target: "data" | "empty" | "error") => {
    setLoading(true);
    await sleep(900);
    setMode(target);
    setLoading(false);
  }, []);

  const onSortingChange = useCallback((updater: Updater<SortingState>) => {
    setSorting(typeof updater === "function" ? (prev: SortingState) => updater(prev) : updater);
  }, []);

  const table = useTable(
    {
      features: dataTableFeatures,
      columns,
      data: SAMPLE_PROJECTS,
      state: { sorting },
      onSortingChange,
    },
    (state) => state,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => void simulate("data")}>
          <Database />
          Show data
        </Button>
        <Button variant="outline" size="sm" onClick={() => void simulate("empty")}>
          Show empty
        </Button>
        <Button variant="outline" size="sm" onClick={() => void simulate("error")}>
          Show error
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {SAMPLE_PROJECTS.length} projects · click a header to sort client-side
        </span>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-card p-4">
          <TableSkeleton rows={6} cols={4} />
        </div>
      ) : mode === "empty" ? (
        <EmptyState
          title="Nothing to display"
          description="This is the shared EmptyState — used by the order apps when a query returns zero rows."
          action={
            <Button variant="outline" size="sm" onClick={() => void simulate("data")}>
              <RotateCcw />
              Back to data
            </Button>
          }
        />
      ) : mode === "error" ? (
        <ErrorPanel
          title="The request failed"
          description="This is the shared ErrorPanel with a retry action."
          onRetry={() => void simulate("data")}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <DataTable table={table} />
        </div>
      )}
    </div>
  );
}
