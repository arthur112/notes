import { useSyncExternalStore } from "react";
import { getRouteApi } from "@tanstack/react-router";

import { DataTable } from "@/shared/filtering/data-table";
import { FilterBar } from "@/shared/filtering/filter-bar";
import { FilterDiagnostics } from "@/shared/filtering/filter-diagnostics";
import { FilterPage } from "@/shared/filtering/filter-page";

import { getRequestLog, subscribeRequestLog } from "./api/customers-api";
import { useCustomers } from "./api/use-customers";
import { CUSTOMER_COLUMNS } from "./customers-columns";
import { customersFilter, type CustomersSearchInput } from "./filter";

const routeApi = getRouteApi("/customers");

/**
 * The second filtered domain, built from the same pieces as orders: one
 * filter definition, the shared bar, table and diagnostics. Only the fields,
 * columns and mock differ.
 */
export function CustomersPage() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const customers = useCustomers(search);
  const log = useSyncExternalStore(subscribeRequestLog, getRequestLog);

  const patch = (changes: CustomersSearchInput) =>
    void navigate({ search: (prev) => ({ ...prev, page: undefined, ...changes }) });

  return (
    <FilterPage
      title="Customers"
      description="The same URL-as-filter pattern and controls, driven by the customers filter definition."
    >
      <FilterBar
        definition={customersFilter}
        search={search}
        onPatch={patch}
        onClear={() => patch(customersFilter.cleared)}
      />

      <FilterDiagnostics
        definition={customersFilter}
        search={search}
        log={log}
        isFetching={customers.isFetching}
        isError={customers.isError}
      >
        <section className="space-y-2">
          <h2 className="text-sm font-medium">
            Customers{" "}
            <span className="text-muted-foreground">
              (sorted + paged by the mock — the filter is not applied)
            </span>
          </h2>
          <DataTable
            columns={CUSTOMER_COLUMNS}
            result={customers}
            search={search}
            onPatch={patch}
            pageSizes={customersFilter.pageSizes}
            itemsLabel="customers"
            emptyMessage="No customers on this page."
            errorLabel="Could not load customers"
          />
        </section>
      </FilterDiagnostics>
    </FilterPage>
  );
}
