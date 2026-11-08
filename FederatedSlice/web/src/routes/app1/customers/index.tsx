import { createFileRoute } from "@tanstack/react-router";

import { CustomersPage } from "@/apps/app1/customers/pages";
import { customersListRoute } from "@/domains/customers/use-customers";

export const Route = createFileRoute("/app1/customers/")({
  ...customersListRoute,
  component: CustomersPage,
});
