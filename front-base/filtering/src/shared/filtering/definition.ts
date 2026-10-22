import type { ComponentType } from "react";
import { GridifyQueryBuilder, type IGridifyQuery } from "gridify-client";
import { z } from "zod";

/**
 * The description of a filterable list: a map of field definitions plus the
 * table's sortable columns. `defineFilter` turns it into the three things a
 * filtered list needs — the route's search schema, the Gridify query, and the
 * field order the bar renders — so an entity only declares its fields.
 */

export const PAGE_SIZES = [5, 10, 20] as const;

/**
 * A lenient search key: an invalid value (`status=bogus`, `creditLimit={"min":"abc"}`,
 * `created={"from":"nope"}`) means "no constraint", never a route error.
 * `null` (a cleared control) is normalized to `undefined`.
 */
export const lenient = <T extends z.ZodType>(schema: T) =>
  schema
    .optional()
    .nullable()
    .transform((value): z.output<T> | undefined => value ?? undefined)
    .catch(undefined);

/**
 * Text or a number, as text: the router JSON-parses each URL value, so a
 * hand-typed `?q=123` arrives as a number. The type argument keeps the input
 * type (what `navigate` accepts) from widening to `unknown`.
 */
export const text = z.coerce.string<string | number>().trim().min(1);

/** Raw text (`" 10,5 "`) or a number → an amount; empty or unparsable fails. */
export const amount = text.transform((raw) => Number(raw.replace(",", "."))).pipe(z.number());

/** The props every filter control receives: a value and the next value. */
export type FilterControlProps<TInput> = {
  value: TInput;
  onChange: (next: TInput) => void;
};

/**
 * One filter field. `TValue` is the settled search value (what
 * `toGridifyQuery` reads), `TInput` what the control holds and patches
 * (`{ min: "10,5" }` for a number range, a raw string for search). The route's
 * schema parses the raw input into the settled value.
 */
export type FilterFieldSpec<TValue, TInput = TValue> = {
  readonly label: string;
  /** `inline` sits in the bar; `popover` goes behind the Filters button. */
  readonly placement: "inline" | "popover";
  /** Lenient: invalid or empty input settles to `undefined` = no constraint. */
  readonly schema: z.ZodType<TValue | undefined, TInput | undefined>;
  /** Adds the field's conditions to the Gridify builder; only called with a set value. */
  readonly apply: (builder: GridifyQueryBuilder, value: TValue) => void;
  /** The settled value → what its control shows. */
  readonly toControlValue: (value: TValue | undefined) => TInput;
  readonly control: ComponentType<FilterControlProps<TInput>>;
};

export type AnyFilterField = FilterFieldSpec<any, any>;
export type FilterFieldMap = Record<string, AnyFilterField>;
/** Column id → the Gridify field it orders by. */
export type SortFieldMap = Record<string, string>;

type FieldSchema<F> = F extends { readonly schema: infer Schema } ? Schema : never;
type FieldType<F> =
  FieldSchema<F> extends z.ZodType<infer Output, infer Input>
    ? { output: Exclude<Output, undefined>; input: Exclude<Input, undefined> }
    : never;
type FieldValue<F> = FieldType<F>["output"];
/** Patches may hold a control's raw input **or** an already-settled value. */
type FieldInput<F> = FieldType<F>["input"] | FieldType<F>["output"];

/** Paging + sorting, shared by every filtered list (they are always in the URL). */
export type CommonSearch = {
  /** 1-based, as Gridify counts; absent = page 1. */
  page?: number;
  /** One of the definition's `pageSizes`; absent = the first one. */
  pageSize?: number;
  /**
   * The table's `SortingState` as is (`[{"id":"total","desc":true}, …]`), so
   * its ids come in as plain strings; absent = server order.
   */
  sort?: { id: string; desc: boolean }[];
};

/** The settled search, with each field's parsed value. */
export type FilterSearch<M extends FilterFieldMap> = {
  [K in keyof M]?: FieldValue<M[K]>;
} & CommonSearch;

/** What a patch may hold: typed values or controls' raw input (`"10,5"`). */
export type FilterSearchInput<M extends FilterFieldMap> = {
  [K in keyof M]?: FieldInput<M[K]>;
} & CommonSearch;

export type FilterDefinition<M extends FilterFieldMap, S extends SortFieldMap> = {
  readonly fields: M;
  /** `[key, field]` in declaration order: the order the bar and query use. */
  readonly entries: readonly (readonly [string, AnyFilterField])[];
  readonly sortFields: S;
  /** The first one is the default. */
  readonly pageSizes: readonly number[];
  readonly schema: z.ZodType<FilterSearch<M>, FilterSearchInput<M>>;
  readonly toGridifyQuery: (search: FilterSearch<M>) => IGridifyQuery;
  /** The patch that clears the popover fields; the inline search stays. */
  readonly cleared: FilterSearchInput<M>;
};

/**
 * Builds a definition's schema and Gridify mapping from its fields. Each key
 * is `lenient`-wrapped, so a bad value drops out instead of failing the route;
 * the common `page`, `pageSize` and `sort` keys are validated the same way.
 * The schema is cast to the types the field specs declare: Zod sees the raw
 * input types, the cast carries the control-friendly ones (`number | null`).
 */
export function defineFilter<const M extends FilterFieldMap, const S extends SortFieldMap>(config: {
  fields: M;
  sortFields: S;
  pageSizes?: readonly number[];
}): FilterDefinition<M, S> {
  const pageSizes = config.pageSizes ?? PAGE_SIZES;
  const entries = Object.entries(config.fields) as (readonly [string, AnyFilterField])[];
  const sortColumns = Object.keys(config.sortFields);
  const fieldShape = Object.fromEntries(
    entries.map(([key, field]) => [key, field.schema]),
  ) as Record<string, z.ZodType>;

  const schema = z.object({
    ...fieldShape,
    page: lenient(z.int().min(1)),
    pageSize: lenient(z.number().refine((value) => pageSizes.includes(value))),
    sort: lenient(
      z
        .array(
          z.object({
            id: z.string().refine((id) => sortColumns.includes(id)),
            desc: z.boolean(),
          }),
        )
        .min(1),
    ),
  });

  function toGridifyQuery(search: FilterSearch<M>): IGridifyQuery {
    const { page, pageSize, sort, ...values } = search;
    const builder = new GridifyQueryBuilder()
      .setPage(page ?? 1)
      .setPageSize(pageSize ?? pageSizes[0]);
    for (const { id, desc } of sort ?? []) {
      builder.addOrderBy((config.sortFields as SortFieldMap)[id], desc);
    }
    // Insertion order, so the query reads in the order the fields are declared.
    for (const [key, field] of entries) {
      const value = (values as Record<string, unknown>)[key];
      if (value !== undefined) field.apply(builder, value);
    }
    return builder.build();
  }

  return {
    fields: config.fields,
    entries,
    sortFields: config.sortFields,
    pageSizes,
    schema: schema as unknown as z.ZodType<FilterSearch<M>, FilterSearchInput<M>>,
    toGridifyQuery,
    cleared: Object.fromEntries(
      entries.filter(([, field]) => field.placement === "popover").map(([key]) => [key, undefined]),
    ) as FilterSearchInput<M>,
  };
}
