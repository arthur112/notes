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

/** Base UI Combobox props a caller may add: labels, equality, filtering… */
export type ComboboxPassthroughProps<T, Multiple extends boolean = false> = Omit<
  ComboboxRootProps<T, Multiple>,
  "items" | "value" | "defaultValue" | "onValueChange" | "multiple"
>;

type SelectProps<T, Multiple extends boolean> = ControlProps & {
  items: readonly T[];
  placeholder?: string;
  emptyMessage?: string;
  /** Spread on the Combobox root; `itemToStringLabel` / `itemToStringValue` default to `String`. */
  comboboxProps?: ComboboxPassthroughProps<T, Multiple>;
};

/**
 * The app's selects: shadcn's Combobox over a list of `items` of any type,
 * labelled by `itemToStringLabel` and keyed by `itemToStringValue`. The
 * control props (`id`, `aria-*`, …) go to the input.
 */
export function ComboboxSelect<T>({
  items,
  value,
  onValueChange,
  placeholder,
  emptyMessage,
  comboboxProps,
  className,
  ...control
}: SelectProps<T, false> & { value: T | null; onValueChange: (next: T | null) => void }) {
  return (
    <Combobox
      {...comboboxProps}
      items={items}
      value={value}
      onValueChange={(next) => onValueChange(next)}
    >
      <ComboboxInput
        {...control}
        showClear
        placeholder={placeholder}
        className={cn(CONTROL_CLASS, className)}
      />
      <ComboboxOptions emptyMessage={emptyMessage} comboboxProps={comboboxProps} />
    </Combobox>
  );
}

/** Any number of items, shown as chips. */
export function ComboboxMultiSelect<T>({
  items,
  value,
  onValueChange,
  placeholder,
  emptyMessage,
  comboboxProps,
  className,
  ...control
}: SelectProps<T, true> & { value: T[]; onValueChange: (next: T[]) => void }) {
  const anchor = useComboboxAnchor();
  const toValue = comboboxProps?.itemToStringValue ?? String;
  const toLabel = comboboxProps?.itemToStringLabel ?? String;
  return (
    <Combobox
      {...comboboxProps}
      multiple
      items={items}
      value={value}
      onValueChange={(next) => onValueChange(next)}
    >
      <ComboboxChips ref={anchor} className={cn("min-h-9 w-full", className)}>
        {value.map((item) => (
          <ComboboxChip key={toValue(item)}>{toLabel(item)}</ComboboxChip>
        ))}
        <ComboboxChipsInput {...control} placeholder={value.length > 0 ? undefined : placeholder} />
      </ComboboxChips>
      <ComboboxOptions anchor={anchor} emptyMessage={emptyMessage} comboboxProps={comboboxProps} />
    </Combobox>
  );
}

function ComboboxOptions<T>({
  anchor,
  emptyMessage = "No results.",
  comboboxProps,
}: {
  anchor?: ReturnType<typeof useComboboxAnchor>;
  emptyMessage?: string;
  comboboxProps?: Pick<ComboboxPassthroughProps<T>, "itemToStringLabel" | "itemToStringValue">;
}) {
  const toValue = comboboxProps?.itemToStringValue ?? String;
  const toLabel = comboboxProps?.itemToStringLabel ?? String;
  return (
    <ComboboxContent anchor={anchor}>
      <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
      <ComboboxList>
        {(item: T) => (
          <ComboboxItem key={toValue(item)} value={item}>
            {toLabel(item)}
          </ComboboxItem>
        )}
      </ComboboxList>
    </ComboboxContent>
  );
}
