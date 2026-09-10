import { createFileRoute } from "@tanstack/react-router";

import { OrderDetailPage } from "../../apps/orders-ops/features/order-detail/pages/order-detail-page";
import { orderDetailSearchSchema } from "../../apps/orders-ops/features/order-detail/types/order-detail-tab";

/** The order record page, nested under the Ops layout at `/apps/orders-ops`. */
export const Route = createFileRoute("/apps/orders-ops/$orderNo")({
  component: OrderDetailPage,
  validateSearch: (search) => orderDetailSearchSchema.parse(search),
});
