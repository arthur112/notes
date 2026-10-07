import { createFileRoute } from "@tanstack/react-router";

import { ordersQueryOptions } from "../features/orders-filters/api/use-orders";
import {
  validateOrdersSearch,
  searchToFilter,
  toGridifyFilter,
} from "../features/orders-filters/filter";
import { FiltersPage } from "../features/orders-filters/filters-page";

export const Route = createFileRoute("/")({
  validateSearch: validateOrdersSearch,
  // The loader re-runs whenever the search (= the settled filter) changes.
  loaderDeps: ({ search }) => search,
  // Start the fetch without awaiting it, so the page (and its filter bar) shows
  // at once with its own loading state. On a cold load the request runs in
  // parallel with the download of the code-split page chunk instead of after it.
  // The page's useQuery joins the in-flight request rather than sending another.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(
      ordersQueryOptions(toGridifyFilter(searchToFilter(deps))),
    );
  },
  component: FiltersPage,
});
