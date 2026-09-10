import { createFileRoute } from "@tanstack/react-router";

import { OpsOrdersPage } from "../../apps/orders-ops/features/orders/pages/ops-orders-page";

export const Route = createFileRoute("/apps/orders-ops/")({
  component: OpsOrdersPage,
});
