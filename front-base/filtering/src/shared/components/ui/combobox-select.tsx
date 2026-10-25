import type { ComboboxRootProps } from "@base-ui/react/combobox";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/shared/components/ui/combobox";
import { cn } from "@/shared/lib/utils";

import { CONTROL_CLASS, type ControlProps } from "./control";

/** What a select holds: a primitive item itself, or the key `itemToValue` takes from an object. */
export type SelectValue = string | number | boolean;

/** Base UI Combobox props a caller may add: labels, filtering… The string value comes from `itemToValue`. */
export type ComboboxPassthroughProps<T, Multiple extends boolean = false> = Omit<
  ComboboxRootProps<T, Multiple>,
  "items" | "value" | "defaultValue" | "onValueChange" | "multiple" | "itemToStringValue"
>;

type SelectProps<T, V, Multiple extends boolean> = ControlProps & {
  items: readonly T[];
  /** The value an item stands for (`customer.customerNo`); defaults to the item itself. */
  itemToValue?: (item: T) => V;
  placeholder?: string;
  emptyMessage?: string;
  /** Spread on the Combobox root; `itemToStringLabel` defaults to `String`. */
  comboboxProps?: ComboboxPassthroughProps<T, Multiple>;
};

const itself = <T, V>(item: T) => item as unknown as V;

/**
 * The app's selects: shadcn's Combobox over a list of `items` of any type,
 * labelled by `itemToStringLabel`. Like a native select, the value is not the
 * item but what it stands for (`itemToValue`), so an object picker holds its
 * key with its own type (`42`, not `"42"`). The control props (`id`,
 * `aria-*`, …) go to the input.
 */
export function ComboboxSelect<T, V extends SelectValue>({
  items,
  itemToValue = itself,
  value,
  onValueChange,
  placeholder,
  emptyMessage,
  comboboxProps,
  className,
  ...control
}: SelectProps<T, V, false> & { value: V | null; onValueChange: (next: V | null) => void }) {
  return (
    <Combobox
      {...comboboxProps}
      itemToStringValue={(item) => String(itemToValue(item))}
      items={items}
      value={value === null ? null : (items.find((item) => itemToValue(item) === value) ?? null)}
      onValueChange={(item) => onValueChange(item === null ? null : itemToValue(item))}
    >
      <ComboboxInput
        {...control}
        showClear
        placeholder={placeholder}
        className={cn(CONTROL_CLASS, className)}
      />
      <ComboboxOptions
        itemToValue={itemToValue}
        itemToStringLabel={comboboxProps?.itemToStringLabel}
        emptyMessage={emptyMessage}
      />
    </Combobox>
  );
}

/** Any number of items, shown as chips. */
export function ComboboxMultiSelect<T, V extends SelectValue>({
  items,
  itemToValue = itself,
  value,
  onValueChange,
  placeholder,
  emptyMessage,
  comboboxProps,
  className,
  ...control
}: SelectProps<T, V, true> & { value: V[]; onValueChange: (next: V[]) => void }) {
  const anchor = useComboboxAnchor();
  const toLabel = comboboxProps?.itemToStringLabel ?? String;
  const selected = value.flatMap((key) => items.find((item) => itemToValue(item) === key) ?? []);
  return (
    <Combobox
      {...comboboxProps}
      multiple
      itemToStringValue={(item) => String(itemToValue(item))}
      items={items}
      value={selected}
      onValueChange={(next) => onValueChange(next.map(itemToValue))}
    >
      <ComboboxChips ref={anchor} className={cn("min-h-9 w-full", className)}>
        {selected.map((item) => (
          <ComboboxChip key={String(itemToValue(item))}>{toLabel(item)}</ComboboxChip>
        ))}
        <ComboboxChipsInput {...control} placeholder={value.length > 0 ? undefined : placeholder} />
      </ComboboxChips>
      <ComboboxOptions
        anchor={anchor}
        itemToValue={itemToValue}
        itemToStringLabel={comboboxProps?.itemToStringLabel}
        emptyMessage={emptyMessage}
      />
    </Combobox>
  );
}

function ComboboxOptions<T>({
  anchor,
  itemToValue,
  itemToStringLabel = String,
  emptyMessage = "No results.",
}: {
  anchor?: ReturnType<typeof useComboboxAnchor>;
  itemToValue: (item: T) => SelectValue;
  itemToStringLabel?: (item: T) => string;
  emptyMessage?: string;
}) {
  return (
    <ComboboxContent anchor={anchor}>
      <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
      <ComboboxList>
        {(item: T) => (
          <ComboboxItem key={String(itemToValue(item))} value={item}>
            {itemToStringLabel(item)}
          </ComboboxItem>
        )}
      </ComboboxList>
    </ComboboxContent>
  );
}
