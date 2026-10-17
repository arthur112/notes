import { createFileRoute } from "@tanstack/react-router";

import { NewOrderPage } from "@/features/order-form/order-form-page";

export const Route = createFileRoute("/orders/new")({
  component: NewOrderPage,
});
