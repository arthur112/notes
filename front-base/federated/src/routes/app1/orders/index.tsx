import { createFileRoute } from "@tanstack/react-router";

import { OrdersPage } from "@/apps/app1/orders/pages";
import { ordersListRoute } from "@/domains/orders/use-orders";

export const Route = createFileRoute("/app1/orders/")({
  ...ordersListRoute,
  component: OrdersPage,
});
