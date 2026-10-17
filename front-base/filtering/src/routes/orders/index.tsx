import { noop } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ordersQueryOptions } from "@/features/orders-filters/api/use-orders";
import { ordersSearchSchema } from "@/features/orders-filters/filter";
import { OrdersPage } from "@/features/orders-filters/orders-page";

export const Route = createFileRoute("/orders/")({
  validateSearch: ordersSearchSchema,
  // The loader re-runs whenever the search (= the settled filter) changes.
  loaderDeps: ({ search }) => search,
  // Start the fetch without awaiting it, so the page (and its filter bar) shows
  // at once with its own loading state. On a cold load the request runs in
  // parallel with the download of the code-split page chunk instead of after it.
  // The page's useQuery joins the in-flight request rather than sending another.
  loader: ({ context, deps }) => {
    context.queryClient.query(ordersQueryOptions(deps)).catch(noop);
  },
  component: OrdersPage,
});
