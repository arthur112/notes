import { createFileRoute } from "@tanstack/react-router";

import { FiltersPage } from "../features/orders-filters/filters-page";

export const Route = createFileRoute("/")({
  component: FiltersPage,
});
