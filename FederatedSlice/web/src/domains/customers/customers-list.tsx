import { useSyncExternalStore } from "react";

import type { Customer } from "@/api/customers";
import { DataTable, type FilterColumn } from "@/shared/filtering/data-table";
import { FilterBar } from "@/shared/filtering/filter-bar";
import { FilterDiagnostics } from "@/shared/filtering/filter-diagnostics";
import { FilterPage } from "@/shared/filtering/filter-page";

import { getRequestLog, subscribeRequestLog } from "@/api/customers";
import { useCustomers } from "./use-customers";
import { CUSTOMER_COLUMNS } from "./columns";
import { customersFilter, type CustomersSearch, type CustomersSearchInput } from "./filter";

/**
 * The customers list, for any app: same composition as orders, different
 * definition. The app's page passes the route's `search` and `onPatch`.
 */
export function CustomersList({
  search,
  onPatch: patch,
  columns = CUSTOMER_COLUMNS,
}: {
  search: CustomersSearch;
  onPatch: (changes: CustomersSearchInput) => void;
  columns?: FilterColumn<Customer>[];
}) {
  const customers = useCustomers(search);
  const log = useSyncExternalStore(subscribeRequestLog, getRequestLog);

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
            <span className="text-muted-foreground">(filtered, sorted and paged by the API)</span>
          </h2>
          <DataTable
            columns={columns}
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
