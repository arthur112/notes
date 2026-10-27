import { z } from "zod";

import {
  defineFilter,
  type FilterSearch,
  type FilterSearchInput,
} from "@/shared/filtering/definition";
import {
  booleanSelectField,
  dateRangeField,
  flagsField,
  multiSelectField,
  numberRangeField,
  searchField,
  selectField,
} from "@/shared/filtering/fields";

import { useCustomerOptions } from "./api/use-customers";

/**
 * The customers filter definition. The schema, the Gridify query and the
 * filter bar all come from this one list of fields; the page and the mock API
 * only add their columns, data and labels.
 */

export const SEGMENTS = ["Enterprise", "SMB", "Startup"] as const;
export type Segment = (typeof SEGMENTS)[number];

export const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Germany",
  "Netherlands",
  "Sweden",
] as const;
export type Country = (typeof COUNTRIES)[number];

export const PAYMENT_TERMS = [15, 30, 60, 90];

/** The table's sortable columns (its column ids) → the Gridify field each orders by. */
export const SORT_FIELDS = {
  name: "name",
  segment: "segment",
  country: "country",
  active: "active",
  creditLimit: "creditLimit",
  createdAt: "createdAt",
} as const;

export const customersFilter = defineFilter({
  fields: {
    q: searchField({
      placeholder: "Name or email…",
      ariaLabel: "Search customers by name or email",
      fields: ["name", "email"],
    }),
    segment: selectField({
      label: "Segment",
      field: "segment",
      source: { options: SEGMENTS },
      schema: z.enum(SEGMENTS),
      placeholder: "Any segment",
      ariaLabel: "Segment",
    }),
    countries: multiSelectField({
      label: "Countries",
      field: "country",
      source: { options: COUNTRIES },
      schema: z.enum(COUNTRIES),
      placeholder: "Any country",
      ariaLabel: "Countries",
    }),
    // Object items from a query, many at once: only the customer numbers are stored.
    customers: multiSelectField({
      label: "Customers",
      field: "customerNo",
      source: { useOptions: useCustomerOptions },
      itemToValue: (customer) => customer.customerNo,
      schema: z.string(),
      comboboxProps: { itemToStringLabel: (customer) => customer.name },
      placeholder: "Any customer",
      ariaLabel: "Customers",
    }),
    // Number items, many at once (`paymentTerms=[30,60]`).
    paymentTerms: multiSelectField({
      label: "Payment terms",
      field: "paymentTermsDays",
      source: { options: PAYMENT_TERMS },
      schema: z.number(),
      comboboxProps: { itemToStringLabel: (days) => `${days} days` },
      placeholder: "Any terms",
      ariaLabel: "Payment terms",
    }),
    active: booleanSelectField({
      label: "Status",
      field: "active",
      trueLabel: "Active",
      falseLabel: "Inactive",
      placeholder: "Any status",
      ariaLabel: "Status",
    }),
    // One multi-select over several boolean columns, any of them matching.
    flags: flagsField({
      label: "Flags",
      flags: {
        vip: { label: "VIP", field: "isVip" },
        verified: { label: "Verified", field: "isVerified" },
        onHold: { label: "On hold", field: "isOnHold" },
        released: { label: "Not on hold", field: "isOnHold", value: false },
      },
      placeholder: "Any flag",
      ariaLabel: "Flags",
    }),
    creditLimit: numberRangeField({
      label: "Credit limit (€)",
      field: "creditLimit",
      minAriaLabel: "Minimum credit limit",
      maxAriaLabel: "Maximum credit limit",
    }),
    created: dateRangeField({
      label: "Customer since",
      field: "createdAt",
      ariaLabel: "Customer since period",
    }),
  },
  sortFields: SORT_FIELDS,
});

export type CustomersSearch = FilterSearch<typeof customersFilter.fields>;
export type CustomersSearchInput = FilterSearchInput<typeof customersFilter.fields>;

/** The route's `validateSearch`, derived from the definition. */
export const customersSearchSchema = customersFilter.schema;

/** The Gridify query the customers list sends. */
export const toGridifyQuery = customersFilter.toGridifyQuery;
