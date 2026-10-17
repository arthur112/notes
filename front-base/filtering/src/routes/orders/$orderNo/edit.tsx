import { createFileRoute } from "@tanstack/react-router";

import { orderQueryOptions } from "@/features/orders-filters/api/use-orders";
import { EditOrderPage } from "@/features/order-form/order-form-page";

export const Route = createFileRoute("/orders/$orderNo/edit")({
  // Awaited, unlike the list's loader: the form reads its defaults once, at
  // mount, so the order must be there before the page renders.
  loader: ({ context, params }) =>
    context.queryClient.query({
      ...orderQueryOptions(params.orderNo),
      staleTime: "static",
    }),
  component: EditOrderPage,
});
