import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";

/**
 * Layout for the Ops app: the list lives on the index child, the order record
 * on `$orderNo`. Keeping the nav metadata on the layout means the sidebar entry
 * stays `/apps/orders-ops` (and stays active while a detail is open).
 */
export const Route = createFileRoute("/apps/orders-ops")({
  component: OrdersOpsLayout,
  staticData: {
    nav: {
      title: "Orders · Ops",
      description:
        "The order desk: five server-side filters, rich columns, order detail pages, status changes and order creation.",
      group: "Orders",
      icon: ClipboardList,
    },
  },
});

function OrdersOpsLayout() {
  return <Outlet />;
}
