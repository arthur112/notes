import type { ColumnDef } from "@tanstack/react-table";

import { createDataColumnHelper, type DataTableFeatures } from "@/shared/components/data-table";
import { CHANNEL_LABELS } from "@/shared/domain/orders";
import type { Order } from "@/shared/domain/orders";
import {
  CurrencyCell,
  CustomerCell,
  DateCell,
  OrderStatusBadge,
} from "@/shared/domain/orders/components/order-cells";

const helper = createDataColumnHelper<Order>();

/** The Finance columns: fiscal focus (net/VAT/total), no row actions. */
export function buildFinanceColumns(): ColumnDef<DataTableFeatures, Order>[] {
  return helper.columns([
    helper.accessor("orderNo", {
      header: "Order",
      meta: { label: "Order", align: "left" },
      cell: (info) => (
        <span className="font-mono text-[13px] font-medium tabular-nums">
          {info.getValue<string>()}
        </span>
      ),
    }),
    helper.accessor("customer.name", {
      id: "customer.name",
      header: "Customer",
      meta: { label: "Customer" },
      cell: (info) => {
        const customer = info.row.original.customer;
        return <CustomerCell name={customer.name} country={customer.country} />;
      },
    }),
    helper.accessor("channel", {
      header: "Channel",
      enableSorting: false,
      meta: { label: "Channel" },
      cell: (info) => (
        <span className="text-muted-foreground">{CHANNEL_LABELS[info.getValue()]}</span>
      ),
    }),
    helper.accessor("createdAt", {
      header: "Created",
      meta: { label: "Created" },
      cell: (info) => <DateCell iso={info.getValue<string>()} />,
    }),
    helper.accessor("dueDate", {
      header: "Due",
      meta: { label: "Due" },
      cell: (info) => <DateCell iso={info.getValue<string>()} />,
    }),
    helper.accessor("status", {
      header: "Status",
      enableSorting: false,
      meta: { label: "Status" },
      cell: (info) => <OrderStatusBadge status={info.getValue()} />,
    }),
    helper.accessor("subtotal", {
      header: "Net",
      meta: { label: "Net", align: "right" },
      cell: (info) => <CurrencyCell value={info.getValue()} />,
    }),
    helper.accessor("tax", {
      header: "VAT",
      meta: { label: "VAT", align: "right" },
      cell: (info) => <CurrencyCell value={info.getValue()} />,
    }),
    helper.accessor("total", {
      header: "Total",
      meta: { label: "Total", align: "right" },
      cell: (info) => <CurrencyCell value={info.getValue()} className="font-medium" />,
    }),
  ]);
}
