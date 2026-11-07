import { createFileRoute } from "@tanstack/react-router";

import { CustomersPage } from "@/apps/app2/customers/pages";
import { customersListRoute } from "@/domains/customers/use-customers";

export const Route = createFileRoute("/app2/customers/")({
  ...customersListRoute,
  component: CustomersPage,
});
