import { createFileRoute } from "@tanstack/react-router";

import { NewOrderPage } from "@/apps/app1/orders/pages";

export const Route = createFileRoute("/app1/orders/new")({
  component: NewOrderPage,
});
