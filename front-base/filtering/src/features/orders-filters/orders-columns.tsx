import { createColumnHelper } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";

import { filterTableFeatures, type FilterColumn } from "@/shared/filtering/data-table";
import { formatDate } from "@/shared/lib/format";

import type { Order } from "./api/orders-api";

/**
 * TanStack Table v9 columns for the orders list. The column ids are the sort
 * keys of the URL (`SORT_FIELDS` in `filter.ts`), so a header click writes the
 * same id the schema validates.
 */
const helper = createColumnHelper<typeof filterTableFeatures, Order>();

export const ORDER_COLUMNS: FilterColumn<Order>[] = helper.columns([
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
