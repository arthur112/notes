import { MoreHorizontal } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  CustomerCell,
  CurrencyCell,
  DateCell,
  OrderStatusBadge,
} from "@/shared/domain/orders/components/order-cells";
import { createDataColumnHelper, type DataTableFeatures } from "@/shared/components/data-table";
import { CHANNEL_LABELS, ORDER_STATUSES, STATUS_META } from "@/shared/domain/orders";
import type { Order, OrderStatus } from "@/shared/domain/orders";

const helper = createDataColumnHelper<Order>();

export type OpsColumnActions = {
  onOpen: (order: Order) => void;
  onSetStatus: (order: Order, status: OrderStatus) => void;
};

/**
 * The Ops table columns: a mono order-number anchor, a single-line customer
 * identity, and a per-row action menu that stays hidden until the row is
 * hovered or focused (so it never competes with the data for attention).
 */
export function buildOpsColumns(actions: OpsColumnActions): ColumnDef<DataTableFeatures, Order>[] {
  return helper.columns([
    helper.accessor("orderNo", {
      header: "Order",
      meta: { label: "Order", align: "left" },
      cell: (info) => (
        <span className="font-mono text-[13px] font-medium tabular-nums group-hover/row:text-primary">
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
    helper.accessor("createdAt", {
      header: "Created",
      meta: { label: "Created" },
      cell: (info) => <DateCell iso={info.getValue<string>()} />,
    }),
    helper.accessor("channel", {
      header: "Channel",
      enableSorting: false,
      meta: { label: "Channel" },
      cell: (info) => (
        <span className="text-muted-foreground">{CHANNEL_LABELS[info.getValue()]}</span>
      ),
    }),
    helper.accessor("status", {
      header: "Status",
      enableSorting: false,
      meta: { label: "Status" },
      cell: (info) => <OrderStatusBadge status={info.getValue()} />,
    }),
    helper.accessor("total", {
      header: "Total",
      meta: { label: "Total", align: "right" },
      cell: (info) => <CurrencyCell value={info.getValue()} className="font-medium" />,
    }),
    helper.display({
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: "",
      meta: { label: "Actions", align: "right", locked: true },
      cell: ({ row }) => {
        const order = row.original;
        const transitions = ORDER_STATUSES.filter((s) => s !== order.status);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${order.orderNo}`}
                  onClick={(event) => event.stopPropagation()}
                  className="opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onOpen(order)}>
                View details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Change status</DropdownMenuLabel>
                {transitions.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    variant={status === "cancelled" ? "destructive" : "default"}
                    onClick={() => actions.onSetStatus(order, status)}
                  >
                    Mark as {STATUS_META[status].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ]);
}
