import { createFileRoute } from "@tanstack/react-router";

import { OrderPage } from "@/apps/app1/orders/pages";
import { orderOverviewRouteLoader } from "@/domains/orders/use-orders";

export const Route = createFileRoute("/app1/orders/$orderNo/")({
  loader: orderOverviewRouteLoader,
  component: OrderPage,
});
