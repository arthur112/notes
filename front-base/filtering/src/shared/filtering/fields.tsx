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

import type { FilterFieldSpec } from "./definition";
import {
  dateRangeQuery,
  multiSelectQuery,
  numberRangeQuery,
  searchQuery,
  selectQuery,
  type DateRangeValue,
  type NumberRangeValue,
  type Stored,
} from "./field-queries";

/**
 * The field builders. Each returns a complete `FilterFieldSpec`: schema,
 * Gridify condition, control value mapping and control — so an entity's filter
 * is a list of calls, not a schema + a query + a bar wired by hand. The schema
 * and condition come from `field-queries.ts`; this file adds the controls.
 */

// ── Search ────────────────────────────────────────────────────────────────

export type SearchFieldConfig = {
  label?: string;
  placeholder: string;
  ariaLabel: string;
  /** The Gridify fields the free text is matched against (any of them). */
  fields: readonly string[];
};

/** See `searchQuery`. */
export function searchField({
  label = "Search",
  placeholder,
  ariaLabel,
  fields,
}: SearchFieldConfig): FilterFieldSpec<string, string> {
  return {
    label,
    placement: "inline",
    ...searchQuery(fields),
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

/**
 * An item is stored as is, unless `itemToValue` is given: then only that key
 * is stored, with its own type (`"CUS-1002"` or `42`, not the whole item), and
 * the control finds the loaded item it belongs to. Base UI keys the options
 * by that key as text.
 */
function storage<T, V extends Stored>(itemToValue?: (item: T) => V) {
  return {
    toStored: (item: T) => (itemToValue ? itemToValue(item) : (item as unknown as V)),
    toItem: (value: V, options: readonly T[]) =>
      itemToValue
        ? options.find((option) => itemToValue(option) === value)
        : (value as unknown as T),
    itemToStringValue: itemToValue && ((item: T) => String(itemToValue(item))),
  };
}

// ── Single select ─────────────────────────────────────────────────────────

/**
 * One value compared with `=`. `T` is any item (a string, a number, a
 * boolean, an object), labelled by `comboboxProps.itemToStringLabel`. For an
 * object, `itemToValue` picks its key, so the URL and Gridify get the key.
 * `schema` parses that stored value, so its type must match the key's.
 */
export function selectField<T, V extends Stored>({
  label,
  field,
  source,
  itemToValue,
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
  /** The key an object item is stored as (`customer.customerNo`, `option.value`). */
  itemToValue?: (item: T) => V;
  schema: z.ZodType<V, V>;
  placeholder?: string;
  ariaLabel?: string;
  emptyMessage?: string;
  comboboxProps?: ComboboxPassthroughProps<T>;
}): FilterFieldSpec<V, V | null> {
  const { toStored, toItem, itemToStringValue } = storage(itemToValue);
  const useOptions = toOptionsHook(source);
  return {
    label,
    placement: "popover",
    ...selectQuery(field, schema),
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
          comboboxProps={{ itemToStringValue, ...comboboxProps }}
        />
      );
    },
  };
}

// ── Multi select ──────────────────────────────────────────────────────────

/**
 * Any number of values, OR-ed together (`country=Germany|country=Sweden`).
 * Items, `itemToValue`, `schema` (for one value) and `comboboxProps` work as
 * in `selectField`.
 */
export function multiSelectField<T, V extends Stored>({
  label,
  field,
  source,
  itemToValue,
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
  itemToValue?: (item: T) => V;
  schema: z.ZodType<V, V>;
  placeholder?: string;
  ariaLabel?: string;
  emptyMessage?: string;
  comboboxProps?: ComboboxPassthroughProps<T, true>;
}): FilterFieldSpec<V[], V[]> {
  const { toStored, toItem, itemToStringValue } = storage(itemToValue);
  const useOptions = toOptionsHook(source);
  return {
    label,
    placement: "popover",
    ...multiSelectQuery(field, schema),
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
          comboboxProps={{ itemToStringValue, ...comboboxProps }}
        />
      );
    },
  };
}

// ── Number range ──────────────────────────────────────────────────────────

/** See `numberRangeQuery`. */
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
    ...numberRangeQuery(field),
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

/** See `dateRangeQuery`. */
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
    ...dateRangeQuery(field),
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
