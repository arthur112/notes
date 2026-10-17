import type { SearchSelectOption } from "@/shared/components/ui/search-select";
import {
  defineFilter,
  type FilterSearch,
  type FilterSearchInput,
} from "@/shared/filtering/definition";
import {
  booleanSelectField,
  dateRangeField,
  multiSelectField,
  numberRangeField,
  searchField,
  selectField,
} from "@/shared/filtering/fields";

/**
 * The customers filter definition. The schema, the Gridify query and the
 * filter bar all come from this one list of fields; the page and the mock API
 * only add their columns, data and labels.
 */

export const SEGMENTS = ["Enterprise", "SMB", "Startup"] as const;
export type Segment = (typeof SEGMENTS)[number];

export const SEGMENT_OPTIONS: SearchSelectOption<Segment>[] = SEGMENTS.map((value) => ({
  value,
  label: value,
}));

export const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Germany",
  "Netherlands",
  "Sweden",
] as const;
export type Country = (typeof COUNTRIES)[number];

export const COUNTRY_OPTIONS: SearchSelectOption<Country>[] = COUNTRIES.map((value) => ({
  value,
  label: value,
}));

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
      options: SEGMENT_OPTIONS,
      placeholder: "Any segment",
      ariaLabel: "Segment",
    }),
    countries: multiSelectField({
      label: "Countries",
      field: "country",
      source: { options: COUNTRY_OPTIONS },
      placeholder: "Any country",
      ariaLabel: "Countries",
    }),
    active: booleanSelectField({
      label: "Status",
      field: "active",
      trueLabel: "Active",
      falseLabel: "Inactive",
      placeholder: "Any status",
      ariaLabel: "Status",
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
