import type { ReactNode } from "react";
import { createColumnHelper } from "@tanstack/react-table";

import { filterTableFeatures, type FilterColumn } from "@/shared/filtering/data-table";
import { formatDate } from "@/shared/lib/format";

import type { Order } from "@/api/orders";

/**
 * TanStack Table v9 columns for the orders list. The column ids are the sort
 * keys of the URL (`SORT_FIELDS` in `filter.ts`), so a header click writes the
 * same id the schema validates.
 */
const helper = createColumnHelper<typeof filterTableFeatures, Order>();

/** For an app composing its own set from the columns below (`orderColumnHelper.columns([…])`). */
export const orderColumnHelper = helper;

/** The order number cell; the app passes its own link, since only it knows its routes. */
export const orderNoColumn = (link: (orderNo: string) => ReactNode) =>
  helper.accessor("orderNo", { header: "Order", cell: ({ getValue }) => link(getValue()) });

export const customerColumn = helper.accessor("customer", { header: "Customer" });
export const statusColumn = helper.accessor("status", {
  header: "Status",
  meta: { className: "capitalize" },
});
export const createdColumn = helper.accessor("createdAt", {
  header: "Created",
  cell: ({ getValue }) => formatDate(getValue()),
  meta: { className: "tabular-nums" },
});
export const totalColumn = helper.accessor("total", {
  header: "Total",
  cell: ({ getValue }) => getValue().toFixed(2),
  meta: { className: "text-right tabular-nums" },
});

/**
 * The default column set. Call it once, at module scope: v9 invalidates its
 * models when the `columns` reference changes.
 */
export const orderColumns = (link: (orderNo: string) => ReactNode): FilterColumn<Order>[] =>
  helper.columns([orderNoColumn(link), customerColumn, statusColumn, createdColumn, totalColumn]);

/** The look of the order number link an app passes to `orderNoColumn` / `orderColumns`. */
export const orderLinkClass = "font-medium underline-offset-4 hover:underline";
