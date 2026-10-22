import { ConditionalOperator as Op } from "gridify-client";
import { z } from "zod";

import {
  ComboboxMultiSelect,
  ComboboxSelect,
  type ComboboxPassthroughProps,
} from "@/shared/components/ui/combobox-select";
import { DateRangePicker, type DateRange } from "@/shared/components/ui/date-picker";
import { NumberRangeInput, type NumberRange } from "@/shared/components/ui/number-range-input";
import { SearchInput } from "@/shared/components/ui/search-input";
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

// ── Select options ────────────────────────────────────────────────────────

export type SelectOptions<T> = {
  options: readonly T[];
  isPending?: boolean;
  isError?: boolean;
};

/**
 * Options are either static or loaded by a hook (the customers picker fetches
 * them). The hook is called inside the control, so its options query mounts
 * with the popover — the first open fetches them, `staleTime` serves the rest.
 */
export type SelectSource<T> = { options: readonly T[] } | { useOptions: () => SelectOptions<T> };

/** A static source as a hook too, so one control serves both. */
const toOptionsHook = <T,>(source: SelectSource<T>): (() => SelectOptions<T>) =>
  "useOptions" in source ? source.useOptions : () => source;

const LOADING = "Loading…";

function emptyText({ isPending, isError }: SelectOptions<unknown>, emptyMessage = "No results.") {
  return isPending ? LOADING : isError ? "Could not load options." : emptyMessage;
}

/** What a select keeps in the URL and compares in Gridify. */
type Stored = string | number | boolean;

/**
 * An item is stored as is, unless `itemToStringValue` is given: then only that
 * key is stored (`"CUS-1002"`, not the whole customer) and the control finds
 * the loaded item it belongs to.
 */
function storage<T, V extends Stored>(itemToStringValue?: (item: T) => string) {
  return {
    toStored: (item: T) => (itemToStringValue ? itemToStringValue(item) : item) as V,
    toItem: (value: V, options: readonly T[]) =>
      itemToStringValue
        ? options.find((option) => itemToStringValue(option) === value)
        : (value as unknown as T),
  };
}

// ── Single select ─────────────────────────────────────────────────────────

/**
 * One value compared with `=`. `T` is any item (a string, a number, a
 * boolean, an object); Base UI's props in `comboboxProps` label it
 * (`itemToStringLabel`) and, for an object, key it (`itemToStringValue`), so
 * the URL and Gridify get the key. `schema` parses that stored value.
 */
export function selectField<T, V extends Stored>({
  label,
  field,
  source,
  schema,
  placeholder,
  ariaLabel,
  emptyMessage,
  comboboxProps,
}: {
  label: string;
  /** The Gridify field the value is compared with `=`. */
  field: string;
  source: SelectSource<T>;
  schema: z.ZodType<V, V>;
  placeholder?: string;
  ariaLabel?: string;
  emptyMessage?: string;
  comboboxProps?: ComboboxPassthroughProps<T>;
}): FilterFieldSpec<V, V | null> {
  const { toStored, toItem } = storage<T, V>(comboboxProps?.itemToStringValue);
  const useOptions = toOptionsHook(source);
  return {
    label,
    placement: "popover",
    schema: lenient(schema),
    apply: (builder, value) => {
      builder.and(true).addCondition(field, Op.Equal, value);
    },
    toControlValue: (value) => value ?? null,
    control: function SelectControl({ value, onChange }) {
      const state = useOptions();
      return (
        <ComboboxSelect
          items={state.options}
          value={value === null ? null : (toItem(value, state.options) ?? null)}
          onValueChange={(item) => onChange(item === null ? null : toStored(item))}
          placeholder={state.isPending ? LOADING : placeholder}
          emptyMessage={emptyText(state, emptyMessage)}
          aria-label={ariaLabel}
          comboboxProps={comboboxProps}
        />
      );
    },
  };
}

// ── Multi select ──────────────────────────────────────────────────────────

/**
 * Any number of values, OR-ed together (`country=Germany|country=Sweden`).
 * Items, `schema` (for one value) and `comboboxProps` work as in `selectField`.
 */
export function multiSelectField<T, V extends Stored>({
  label,
  field,
  source,
  schema,
  placeholder,
  ariaLabel,
  emptyMessage,
  comboboxProps,
}: {
  label: string;
  /** The Gridify field each value is compared with `=`. */
  field: string;
  source: SelectSource<T>;
  schema: z.ZodType<V, V>;
  placeholder?: string;
  ariaLabel?: string;
  emptyMessage?: string;
  comboboxProps?: ComboboxPassthroughProps<T, true>;
}): FilterFieldSpec<V[], V[]> {
  const { toStored, toItem } = storage<T, V>(comboboxProps?.itemToStringValue);
  const useOptions = toOptionsHook(source);
  return {
    label,
    placement: "popover",
    schema: lenient(z.array(schema).min(1)) as z.ZodType<V[] | undefined, V[] | undefined>,
    apply: (builder, values) => {
      builder.and(true).startGroup();
      values.forEach((value, index) => {
        if (index > 0) builder.or();
        builder.addCondition(field, Op.Equal, value);
      });
      builder.endGroup();
    },
    toControlValue: (value) => value ?? [],
    control: function MultiSelectControl({ value, onChange }) {
      const state = useOptions();
      return (
        <ComboboxMultiSelect
          items={state.options}
          value={value.flatMap((stored) => toItem(stored, state.options) ?? [])}
          onValueChange={(items) => onChange(items.map(toStored))}
          placeholder={state.isPending ? LOADING : placeholder}
          emptyMessage={emptyText(state, emptyMessage)}
          aria-label={ariaLabel}
          comboboxProps={comboboxProps}
        />
      );
    },
  };
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
  return selectField({
    label,
    field,
    source: { options: [true, false] },
    schema: z.boolean(),
    placeholder,
    ariaLabel,
    comboboxProps: { itemToStringLabel: (value) => (value ? trueLabel : falseLabel) },
  });
}
