import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Landmark } from "lucide-react";

/**
 * Layout for the Finance app: the list lives on the index child, the order
 * record on `$orderNo` — the same shape as Ops, so one record page serves both.
 */
export const Route = createFileRoute("/apps/orders-finance")({
  component: Outlet,
  staticData: {
    nav: {
      title: "Orders · Finance",
      description:
        "A lean read-only view of the same orders: month + status filters, aggregate cards, fiscal columns.",
      app: "orders",
      icon: Landmark,
    },
  },
});
