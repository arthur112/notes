import { useMemo } from "react";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  createItems,
  useComboboxAnchor,
} from "@/shared/components/ui/combobox";
import { cn } from "@/shared/lib/utils";

export type MultiSelectOption = { value: string; label: string };

export type MultiSelectProps = {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Shown when the query matches nothing (default: "No results."). */
  emptyMessage?: string;
  /** Accessible name; the visible label lives in `FilterField`. */
  ariaLabel?: string;
  /** Size overrides. The field is a fixed `h-14 w-64` by default. */
  className?: string;
};

/**
 * Multi-select built on the shadcn (Base UI) combobox, shaped for this app's
 * dense filters: a **fixed-size** field (`h-14 w-64`, overridable via
 * `className`) whose chips wrap like flex items inside a scroll area, so the
 * field never resizes as selections change. The scrollbar is hidden but the
 * area still scrolls; a pinned clear-all sits outside it so it never scrolls
 * away. Typing filters the list, and Base UI owns the keyboard model (arrows,
 * typeahead, Backspace to remove, Escape).
 *
 * `value` stays a plain array of option ids so filter state never holds objects.
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  emptyMessage = "No results.",
  ariaLabel,
  className,
}: MultiSelectProps) {
  const anchor = useComboboxAnchor();

  const items = useMemo(
    () =>
      createItems(options, {
        getValue: (option) => option.value,
        getLabel: (option) => option.label,
      }),
    [options],
  );

  const labelByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options],
  );

  return (
    <Combobox
      multiple
      autoHighlight
      items={items}
      value={value}
      onValueChange={(next) => onChange(next)}
    >
      <ComboboxChips
        ref={anchor}
        className={cn(
          "h-14 w-64 shrink-0 flex-nowrap items-stretch gap-1 overflow-hidden px-2 py-0 has-data-[slot=combobox-chip]:px-2",
          className,
        )}
      >
        <div className="no-scrollbar flex min-h-0 min-w-0 flex-1 flex-wrap content-start items-center gap-1 overflow-y-auto py-1">
          <ComboboxValue>
            {(selected: string[]) => (
              <>
                {selected.map((selectedValue) => (
                  <ComboboxChip
                    key={selectedValue}
                    aria-label={labelByValue.get(selectedValue) ?? selectedValue}
                    aria-description="Press Backspace or Delete to remove"
                  >
                    {labelByValue.get(selectedValue) ?? selectedValue}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  aria-label={ariaLabel}
                  placeholder={selected.length === 0 ? placeholder : ""}
                  aria-description={
                    selected.length > 0
                      ? `${selected.length} selected. From the start of the input, press Left Arrow to focus the selected items`
                      : undefined
                  }
                />
              </>
            )}
          </ComboboxValue>
        </div>
        {value.length > 0 && (
          <ComboboxClear
            aria-label="Clear selection"
            className="size-7 shrink-0 self-center text-muted-foreground"
          />
        )}
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(option: MultiSelectOption) => (
            <ComboboxItem key={option.value} value={option.value}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
        {value.length > 0 && (
          <div className="border-t border-border px-2.5 py-1 text-xs text-muted-foreground tabular-nums">
            {value.length} of {options.length} selected
          </div>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
