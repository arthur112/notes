import { createFileRoute } from "@tanstack/react-router";

import { OrderPage } from "@/apps/app2/orders/pages";
import { orderRouteLoader } from "@/domains/orders/use-orders";

export const Route = createFileRoute("/app2/orders/$orderNo")({
  loader: orderRouteLoader,
  component: OrderPage,
});
