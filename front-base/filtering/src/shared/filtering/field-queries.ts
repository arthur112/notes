import { ConditionalOperator as Op } from "gridify-client";
import { z } from "zod";

import type { DateRange } from "@/shared/components/ui/date-picker";
import type { NumberRange } from "@/shared/components/ui/number-range-input";
import { addDaysYmd, ymdToUtcIso, type Ymd } from "@/shared/lib/date";

import { amount, lenient, text, type FilterFieldSpec } from "./definition";

/**
 * The query half of each field builder in `fields.tsx`: the schema that parses
 * its search value and the Gridify conditions it adds. Kept apart from the
 * controls (only type imports from the UI), so it loads and tests without them.
 */
export type FieldQuery<TValue, TInput = TValue> = Pick<
  FilterFieldSpec<TValue, TInput>,
  "schema" | "apply"
>;

/** What a select keeps in the URL and compares in Gridify. */
export type Stored = string | number | boolean;

const NUMBER = /^-?\d+(\.\d+)?$/;

/**
 * Free text matched with `Contains` against one or more fields (OR); a number
 * (`123`, `-4.5`) is matched with `=` instead.
 */
export function searchQuery(fields: readonly string[]): FieldQuery<string, string> {
  return {
    schema: lenient(text) as z.ZodType<string | undefined, string | undefined>,
    apply: (builder, query) => {
      const op = NUMBER.test(query) ? Op.Equal : Op.Contains;
      builder.and(true).startGroup();
      fields.forEach((field, index) => {
        if (index > 0) builder.or();
        builder.addCondition(field, op, query);
      });
      builder.endGroup();
    },
  };
}

/** One value compared with `=`. */
export function selectQuery<V extends Stored>(
  field: string,
  schema: z.ZodType<V, V>,
): FieldQuery<V, V | null> {
  return {
    schema: lenient(schema),
    apply: (builder, value) => {
      builder.and(true).addCondition(field, Op.Equal, value);
    },
  };
}

/** Any number of values, OR-ed together (`country=Germany|country=Sweden`). */
export function multiSelectQuery<V extends Stored>(
  field: string,
  schema: z.ZodType<V, V>,
): FieldQuery<V[], V[]> {
  return {
    schema: lenient(z.array(schema).min(1)) as z.ZodType<V[] | undefined, V[] | undefined>,
    apply: (builder, values) => {
      builder.and(true).startGroup();
      values.forEach((value, index) => {
        if (index > 0) builder.or();
        builder.addCondition(field, Op.Equal, value);
      });
      builder.endGroup();
    },
  };
}

export type NumberRangeValue = { min?: number; max?: number };

/** A blank bound ("" or spaces) means "no bound"; a bad one drops just that bound. */
const optionalAmount = lenient(
  z.preprocess(
    (value) =>
      value === null || (typeof value === "string" && value.trim() === "") ? undefined : value,
    amount.optional(),
  ),
);

const numberRangeSchema = z
  .object({ min: optionalAmount, max: optionalAmount })
  .refine((value) => value.min !== undefined || value.max !== undefined);

/** `min` / `max` bounds, both optional but at least one required. */
export function numberRangeQuery(field: string): FieldQuery<NumberRangeValue, NumberRange> {
  return {
    schema: lenient(numberRangeSchema) as z.ZodType<
      NumberRangeValue | undefined,
      NumberRange | undefined
    >,
    apply: (builder, value) => {
      if (value.min !== undefined) {
        builder.and(true).addCondition(field, Op.GreaterThanOrEqual, value.min);
      }
      if (value.max !== undefined) {
        builder.and(true).addCondition(field, Op.LessThanOrEqual, value.max);
      }
    },
  };
}

export type DateRangeValue = { from?: Ymd; to?: Ymd };

const dateOrNull = lenient(
  z.preprocess((value) => (value === "" || value === null ? undefined : value), z.iso.date()),
);

const dateRangeSchema = z
  .object({ from: dateOrNull, to: dateOrNull })
  .refine(({ from, to }) => from ?? to);

/**
 * Inclusive `from`–`to`, as days in the browser's time zone. The query sends the
 * UTC instant each day starts at (what .NET binds to a UTC `DateTime`) and turns
 * `to` into an exclusive next day.
 */
export function dateRangeQuery(field: string): FieldQuery<DateRangeValue, DateRange> {
  return {
    schema: lenient(dateRangeSchema) as z.ZodType<
      DateRangeValue | undefined,
      DateRange | undefined
    >,
    apply: (builder, value) => {
      if (value.from)
        builder.and(true).addCondition(field, Op.GreaterThanOrEqual, ymdToUtcIso(value.from));
      // inclusive `to` → exclusive next-day upper bound
      if (value.to) {
        builder.and(true).addCondition(field, Op.LessThan, ymdToUtcIso(addDaysYmd(value.to, 1)));
      }
    },
  };
}
