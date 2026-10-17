import { createColumnHelper } from "@tanstack/react-table";

import { filterTableFeatures, type FilterColumn } from "@/shared/filtering/data-table";
import { formatDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import type { Customer } from "./api/customers-api";

const helper = createColumnHelper<typeof filterTableFeatures, Customer>();

export const CUSTOMER_COLUMNS: FilterColumn<Customer>[] = helper.columns([
  helper.accessor("name", {
    header: "Customer",
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
  }),
  helper.accessor("segment", { header: "Segment" }),
  helper.accessor("country", { header: "Country" }),
  helper.accessor("active", {
    header: "Status",
    cell: ({ getValue }) => (
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs",
          getValue() ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {getValue() ? "Active" : "Inactive"}
      </span>
    ),
  }),
  helper.accessor("creditLimit", {
    header: "Credit limit",
    cell: ({ getValue }) => getValue().toFixed(2),
    meta: { className: "text-right tabular-nums" },
  }),
  helper.accessor("createdAt", {
    header: "Customer since",
    cell: ({ getValue }) => formatDate(getValue()),
    meta: { className: "tabular-nums" },
  }),
]);
