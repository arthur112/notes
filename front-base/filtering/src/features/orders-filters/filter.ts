import { z } from "zod";

import {
  defineFilter,
  type FilterSearch,
  type FilterSearchInput,
} from "@/shared/filtering/definition";
import {
  dateRangeField,
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

export const LINE_COUNTS = [1, 2, 3, 4, 5];

export const statusLabel = (status: string) => status[0].toUpperCase() + status.slice(1);

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
      source: { options: STATUSES },
      schema: z.enum(STATUSES),
      comboboxProps: { itemToStringLabel: statusLabel },
      placeholder: "Any status",
      ariaLabel: "Status",
    }),
    // Object items from a query: the name is shown, only the customer number is stored.
    customer: selectField({
      label: "Customer",
      field: "customer.customerNo",
      source: { useOptions: useCustomerOptions },
      schema: z.string(),
      comboboxProps: {
        itemToStringLabel: (customer) => customer.name,
        itemToStringValue: (customer) => customer.customerNo,
      },
      placeholder: "Any customer",
      ariaLabel: "Customer",
    }),
    // Number items, stored as numbers (`lineCount=2`).
    lineCount: selectField({
      label: "Lines",
      field: "lineCount",
      source: { options: LINE_COUNTS },
      schema: z.number(),
      comboboxProps: { itemToStringLabel: (count) => `${count} line${count === 1 ? "" : "s"}` },
      placeholder: "Any number of lines",
      ariaLabel: "Lines",
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
