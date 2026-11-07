import { createFileRoute } from "@tanstack/react-router";

import { OrdersPage } from "@/apps/app2/orders/pages";
import { ordersListRoute } from "@/domains/orders/use-orders";

export const Route = createFileRoute("/app2/orders/")({
  ...ordersListRoute,
  component: OrdersPage,
});
