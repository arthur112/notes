import { noop } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { customersQueryOptions } from "@/features/customers-filters/api/use-customers";
import { customersSearchSchema } from "@/features/customers-filters/filter";
import { CustomersPage } from "@/features/customers-filters/customers-page";

export const Route = createFileRoute("/customers")({
  validateSearch: customersSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.query(customersQueryOptions(deps)).catch(noop);
  },
  component: CustomersPage,
});
