import { getRouteApi } from "@tanstack/react-router";

import { CustomersList } from "@/domains/customers/customers-list";

const listRoute = getRouteApi("/app2/customers/");

/** App 2's customers: the domain defaults, wired to this app's route. */
export function CustomersPage() {
  const navigate = listRoute.useNavigate();
  return (
    <CustomersList
      search={listRoute.useSearch()}
      onPatch={(changes) =>
        void navigate({ search: (prev) => ({ ...prev, page: undefined, ...changes }) })
      }
    />
  );
}
