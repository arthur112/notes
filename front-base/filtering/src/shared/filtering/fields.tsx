import { ConditionalOperator as Op } from "gridify-client";
import { z } from "zod";

import { DateRangePicker, type DateRange } from "@/shared/components/ui/date-picker";
import { NumberRangeInput, type NumberRange } from "@/shared/components/ui/number-range-input";
import { SearchInput } from "@/shared/components/ui/search-input";
import {
  SearchMultiSelect,
  SearchSelect,
  type SearchSelectOption,
} from "@/shared/components/ui/search-select";
import { useBufferedValue } from "@/shared/hooks/use-buffered-value";
import { addDaysYmd, type Ymd } from "@/shared/lib/date";

import { amount, lenient, text, type FilterFieldSpec } from "./definition";

/**
 * The field builders. Each returns a complete `FilterFieldSpec`: schema,
 * Gridify condition, control value mapping and control — so an entity's filter
 * is a list of calls, not a schema + a query + a bar wired by hand.
 */

// ── Search ────────────────────────────────────────────────────────────────

export type SearchFieldConfig = {
  label?: string;
  placeholder: string;
  ariaLabel: string;
  /** The Gridify fields the free text is matched against (any of them). */
  fields: readonly string[];
};

/** Free text matched with `Contains` against one or more fields (OR). */
export function searchField({
  label = "Search",
  placeholder,
  ariaLabel,
  fields,
}: SearchFieldConfig): FilterFieldSpec<string, string> {
  return {
    label,
    placement: "inline",
    schema: lenient(text) as z.ZodType<string | undefined, string | undefined>,
    apply: (builder, query) => {
      builder.and(true).startGroup();
      fields.forEach((field, index) => {
        if (index > 0) builder.or();
        builder.addCondition(field, Op.Contains, query);
      });
      builder.endGroup();
    },
    toControlValue: (value) => value ?? "",
    control: (props) => (
      <BufferedSearch {...props} placeholder={placeholder} ariaLabel={ariaLabel} />
    ),
  };
}

function BufferedSearch({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  const buffered = useBufferedValue(value, onChange);
  return <SearchInput {...buffered} placeholder={placeholder} aria-label={ariaLabel} />;
}

// ── Single select ─────────────────────────────────────────────────────────

export function selectField<T extends string>({
  label,
  field,
  options,
  placeholder,
  ariaLabel,
}: {
  label: string;
  /** The Gridify field the value is compared with `=`. */
  field: string;
  options: readonly SearchSelectOption<T>[];
  placeholder?: string;
  ariaLabel?: string;
}): FilterFieldSpec<T, T | null> {
  const values = options.map((option) => option.value) as [T, ...T[]];
  return {
    label,
    placement: "popover",
    schema: lenient(z.enum(values)),
    apply: (builder, value) => {
      builder.and(true).addCondition(field, Op.Equal, value);
    },
    toControlValue: (value) => value ?? null,
    control: ({ value, onChange }) => (
      <SearchSelect
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    ),
  };
}

// ── Multi select ──────────────────────────────────────────────────────────

export type MultiSelectOptions<T extends string> = {
  options: readonly SearchSelectOption<T>[];
  isPending?: boolean;
  isError?: boolean;
};

/**
 * Options are either static or loaded by a hook (the customers picker fetches
 * them). The hook is called inside the control, so its options query mounts
 * with the popover — the first open fetches them, `staleTime` serves the rest.
 */
export type MultiSelectSource<T extends string> =
  | { options: readonly SearchSelectOption<T>[] }
  | { useOptions: () => MultiSelectOptions<T> };

/** Any number of values, OR-ed together (`country=Germany|country=Sweden`). */
export function multiSelectField<T extends string>({
  label,
  field,
  source,
  placeholder,
  ariaLabel,
  emptyMessage,
}: {
  label: string;
  /** The Gridify field each value is compared with `=`. */
  field: string;
  source: MultiSelectSource<T>;
  placeholder?: string;
  ariaLabel?: string;
  emptyMessage?: string;
}): FilterFieldSpec<T[], T[]> {
  return {
    label,
    placement: "popover",
    schema: lenient(z.array(z.string()).min(1)) as z.ZodType<T[] | undefined, T[] | undefined>,
    apply: (builder, values) => {
      builder.and(true).startGroup();
      values.forEach((value, index) => {
        if (index > 0) builder.or();
        builder.addCondition(field, Op.Equal, value);
      });
      builder.endGroup();
    },
    toControlValue: (value) => value ?? [],
    control:
      "useOptions" in source
        ? ({ value, onChange }) => (
            <LoadedMultiSelect
              value={value}
              onChange={onChange}
              useOptions={source.useOptions}
              placeholder={placeholder}
              ariaLabel={ariaLabel}
              emptyMessage={emptyMessage}
            />
          )
        : ({ value, onChange }) => (
            <SearchMultiSelect
              options={source.options}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              aria-label={ariaLabel}
              emptyMessage={emptyMessage}
            />
          ),
  };
}

function LoadedMultiSelect<T extends string>({
  value,
  onChange,
  useOptions,
  placeholder,
  ariaLabel,
  emptyMessage,
}: {
  value: T[];
  onChange: (next: T[]) => void;
  useOptions: () => MultiSelectOptions<T>;
  placeholder?: string;
  ariaLabel?: string;
  emptyMessage?: string;
}) {
  const { options, isPending, isError } = useOptions();
  return (
    <SearchMultiSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={isPending ? "Loading…" : placeholder}
      emptyMessage={isPending ? "Loading…" : isError ? "Could not load options." : emptyMessage}
      aria-label={ariaLabel}
    />
  );
}

// ── Number range ──────────────────────────────────────────────────────────

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
export function numberRangeField({
  label,
  field,
  minAriaLabel = "Minimum",
  maxAriaLabel = "Maximum",
}: {
  label: string;
  /** The Gridify field the bounds apply to. */
  field: string;
  minAriaLabel?: string;
  maxAriaLabel?: string;
}): FilterFieldSpec<NumberRangeValue, NumberRange> {
  return {
    label,
    placement: "popover",
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
    toControlValue: (value) => ({
      min: value?.min === undefined ? "" : String(value.min),
      max: value?.max === undefined ? "" : String(value.max),
    }),
    control: (props) => (
      <BufferedNumberRange {...props} minAriaLabel={minAriaLabel} maxAriaLabel={maxAriaLabel} />
    ),
  };
}

function BufferedNumberRange({
  value,
  onChange,
  minAriaLabel,
  maxAriaLabel,
}: {
  value: NumberRange;
  onChange: (next: NumberRange) => void;
  minAriaLabel: string;
  maxAriaLabel: string;
}) {
  const buffered = useBufferedValue(value, onChange);
  return <NumberRangeInput {...buffered} minAriaLabel={minAriaLabel} maxAriaLabel={maxAriaLabel} />;
}

// ── Date range ────────────────────────────────────────────────────────────

export type DateRangeValue = { from?: Ymd; to?: Ymd };

const dateOrNull = lenient(
  z.preprocess((value) => (value === "" || value === null ? undefined : value), z.iso.date()),
);

const dateRangeSchema = z
  .object({ from: dateOrNull, to: dateOrNull })
  .refine(({ from, to }) => from ?? to);

/** Inclusive `from`–`to`; the query turns `to` into an exclusive next day. */
export function dateRangeField({
  label,
  field,
  ariaLabel,
  placeholder,
}: {
  label: string;
  /** The Gridify date field the bounds apply to. */
  field: string;
  ariaLabel?: string;
  placeholder?: string;
}): FilterFieldSpec<DateRangeValue, DateRange> {
  return {
    label,
    placement: "popover",
    schema: lenient(dateRangeSchema) as z.ZodType<
      DateRangeValue | undefined,
      DateRange | undefined
    >,
    apply: (builder, value) => {
      if (value.from) builder.and(true).addCondition(field, Op.GreaterThanOrEqual, value.from);
      // inclusive `to` → exclusive next-day upper bound
      if (value.to) builder.and(true).addCondition(field, Op.LessThan, addDaysYmd(value.to, 1));
    },
    toControlValue: (value) => ({ from: value?.from ?? null, to: value?.to ?? null }),
    control: ({ value, onChange }) => (
      <DateRangePicker
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        placeholder={placeholder}
      />
    ),
  };
}

// ── Boolean ───────────────────────────────────────────────────────────────

/** A tri-state boolean filter: Active / Inactive / any. */
export function booleanSelectField({
  label,
  field,
  trueLabel = "Active",
  falseLabel = "Inactive",
  placeholder = "Any",
  ariaLabel,
}: {
  label: string;
  field: string;
  trueLabel?: string;
  falseLabel?: string;
  placeholder?: string;
  ariaLabel?: string;
}): FilterFieldSpec<boolean, boolean | null> {
  const options: SearchSelectOption<"true" | "false">[] = [
    { value: "true", label: trueLabel },
    { value: "false", label: falseLabel },
  ];
  return {
    label,
    placement: "popover",
    schema: lenient(z.boolean()) as z.ZodType<boolean | undefined, boolean | null | undefined>,
    apply: (builder, value) => {
      builder.and(true).addCondition(field, Op.Equal, value);
    },
    toControlValue: (value) => value ?? null,
    control: ({ value, onChange }) => (
      <SearchSelect
        options={options}
        value={value === null ? null : value ? "true" : "false"}
        onChange={(next) => onChange(next === null ? null : next === "true")}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    ),
  };
}
