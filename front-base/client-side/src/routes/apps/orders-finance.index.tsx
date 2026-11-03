import { createFileRoute } from "@tanstack/react-router";

import { FinanceOrdersPage } from "../../apps/orders-finance/features/orders/pages/finance-orders-page";

export const Route = createFileRoute("/apps/orders-finance/")({
  component: FinanceOrdersPage,
});
