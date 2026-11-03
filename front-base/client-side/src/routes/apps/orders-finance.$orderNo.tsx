import { createFileRoute } from "@tanstack/react-router";

import { OrderDetailPage } from "../../apps/orders-ops/features/order-detail/pages/order-detail-page";
import { orderDetailSearchSchema } from "../../apps/orders-ops/features/order-detail/types/order-detail-tab";

/**
 * The same record page as Ops, mounted under Finance and read-only. Its links
 * are relative (`..`, `.`), so "All orders" and the tabs stay inside Finance.
 */
export const Route = createFileRoute("/apps/orders-finance/$orderNo")({
  component: () => <OrderDetailPage readOnly />,
  validateSearch: (search) => orderDetailSearchSchema.parse(search),
});
