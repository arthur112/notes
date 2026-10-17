import type { SearchSelectOption } from "@/shared/components/ui/search-select";
import {
  defineFilter,
  type FilterSearch,
  type FilterSearchInput,
} from "@/shared/filtering/definition";
import {
  dateRangeField,
  multiSelectField,
  numberRangeField,
  searchField,
  selectField,
} from "@/shared/filtering/fields";

import { useCustomerOptions } from "@/features/customers-filters/api/use-customers";

/**
 * The orders filter definition. Same shape as customers': the Zod search
 * schema, the Gridify query and the filter bar all derive from `fields`, so
 * adding a control is adding one entry here.
 */

export const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof STATUSES)[number];

export const STATUS_OPTIONS: SearchSelectOption<OrderStatus>[] = STATUSES.map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));

/** The table's sortable columns (its column ids) → the Gridify field each orders by. */
export const SORT_FIELDS = {
  orderNo: "orderNo",
  customer: "customer.name",
  status: "status",
  createdAt: "createdAt",
  total: "total",
} as const;

export const ordersFilter = defineFilter({
  fields: {
    q: searchField({
      placeholder: "Order no or customer…",
      ariaLabel: "Search orders by number or customer",
      fields: ["orderNo", "customer.name"],
    }),
    status: selectField({
      label: "Status",
      field: "status",
      options: STATUS_OPTIONS,
      placeholder: "Any status",
      ariaLabel: "Status",
    }),
    customers: multiSelectField({
      label: "Customers",
      field: "customer.name",
      source: { useOptions: useCustomerOptions },
      placeholder: "Any customer",
      ariaLabel: "Customers",
    }),
    total: numberRangeField({
      label: "Order total (€)",
      field: "total",
      minAriaLabel: "Minimum order total",
      maxAriaLabel: "Maximum order total",
    }),
    created: dateRangeField({
      label: "Created between",
      field: "createdAt",
      ariaLabel: "Created period",
    }),
  },
  sortFields: SORT_FIELDS,
});

export type OrdersSearch = FilterSearch<typeof ordersFilter.fields>;
export type OrdersSearchInput = FilterSearchInput<typeof ordersFilter.fields>;

/** The route's `validateSearch`, derived from the definition. */
export const ordersSearchSchema = ordersFilter.schema;

/** The Gridify query the orders list sends. */
export const toGridifyQuery = ordersFilter.toGridifyQuery;
