import { createFileRoute } from "@tanstack/react-router";

import { EditOrderPage } from "@/apps/app2/orders/pages";
import { orderRouteLoader } from "@/domains/orders/use-orders";

export const Route = createFileRoute("/app2/orders/$orderNo/edit")({
  loader: orderRouteLoader,
  component: EditOrderPage,
});
