import { useEffect, useMemo, useRef, useState } from "react";

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
  /** Size overrides. The field is a fixed `h-11 w-64` by default. */
  className?: string;
};

/**
 * Multi-select built on the shadcn (Base UI) combobox, shaped for this app's
 * dense filters: a **fixed size** field (`h-11 w-64`, overridable via
 * `className`) that shows one full chip row, with the next wrapped row peeking
 * through a mask fade. Chips wrap like flex items and scroll **vertically**
 * through the rows — scrollbar hidden — so the field never resizes, and the
 * fade is the "there's more, scroll" cue. A pinned clear-all sits outside the
 * scroll area so it never scrolls away; typing filters the list, and Base UI
 * owns the keyboard model (arrows, typeahead, Backspace to remove, Escape).
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
  const { ref: scrollRef, edges } = useVerticalScrollEdges<HTMLDivElement>();

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
          "h-11 w-64 shrink-0 flex-nowrap items-center gap-1 overflow-hidden px-2 py-0 has-data-[slot=combobox-chip]:px-2",
          className,
        )}
      >
        <div
          ref={scrollRef}
          className={cn(
            "no-scrollbar flex min-h-0 min-w-0 flex-1 self-stretch flex-wrap content-start items-center gap-1 overflow-x-hidden overflow-y-auto py-1",
            edgeFadeClass(edges),
          )}
        >
          <ComboboxValue>
            {(selected: string[]) => (
              <>
                {selected.map((selectedValue) => (
                  <ComboboxChip
                    key={selectedValue}
                    className="shrink-0"
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
            className="size-7 shrink-0 text-muted-foreground"
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

/** Which edges of a vertical scroller have content hidden beyond them. */
type ScrollEdges = { start: boolean; end: boolean };

/**
 * Tracks a vertical scroller's overflow, re-measuring on scroll, resize and
 * child changes (chips added/removed) so the row-peek fade stays truthful.
 */
function useVerticalScrollEdges<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [edges, setEdges] = useState<ScrollEdges>({ start: false, end: false });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      const max = element.scrollHeight - element.clientHeight;
      const overflowing = max > 1;
      const next: ScrollEdges = {
        start: overflowing && element.scrollTop > 1,
        end: overflowing && element.scrollTop < max - 1,
      };
      setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
    };

    measure();
    element.addEventListener("scroll", measure, { passive: true });
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);
    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(element, { childList: true, subtree: true, characterData: true });

    return () => {
      element.removeEventListener("scroll", measure);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return { ref, edges };
}

/** Masks a scroller's overflowing edge(s) so they fade instead of cutting off. */
function edgeFadeClass({ start, end }: ScrollEdges) {
  if (start && end) return "fade-y-both";
  if (start) return "fade-y-start";
  if (end) return "fade-y-end";
  return undefined;
}
