import { createFileRoute } from "@tanstack/react-router";
import { Landmark } from "lucide-react";

import { FinanceOrdersPage } from "../../apps/orders-finance/features/orders/pages/finance-orders-page";

export const Route = createFileRoute("/apps/orders-finance")({
  component: FinanceOrdersPage,
  staticData: {
    nav: {
      title: "Orders · Finance",
      description:
        "A lean read-only view of the same orders: month + status filters, aggregate cards, fiscal columns.",
      group: "Orders",
      icon: Landmark,
    },
  },
});
