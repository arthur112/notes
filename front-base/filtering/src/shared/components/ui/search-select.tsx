import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { buttonVariants } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";

import { CONTROL_CLASS, type ControlProps } from "./control";
import { SearchInput } from "./search-input";

export type SearchSelectOption<T extends string = string> = { value: T; label: string };

type BaseProps<T extends string> = ControlProps & {
  options: readonly SearchSelectOption<T>[];
  placeholder?: string;
  /** Shown when the query matches nothing (default: "No results."). */
  emptyMessage?: string;
};

export type SearchSelectProps<T extends string = string> = BaseProps<T> & {
  value: T | null;
  onChange: (next: T | null) => void;
};

/** Single-value searchable select (popover + filtered option list). Closes on pick. */
export function SearchSelect<T extends string = string>({
  value,
  onChange,
  ...props
}: SearchSelectProps<T>) {
  return (
    <OptionsPopover
      {...props}
      isSelected={(option) => option === value}
      onPick={onChange}
      onClear={value === null ? undefined : () => onChange(null)}
      closeOnPick
    />
  );
}

export type SearchMultiSelectProps<T extends string = string> = BaseProps<T> & {
  value: readonly T[];
  onChange: (next: T[]) => void;
};

/** Multi-value searchable select: a pick toggles the option and keeps the list open. */
export function SearchMultiSelect<T extends string = string>({
  value,
  onChange,
  ...props
}: SearchMultiSelectProps<T>) {
  return (
    <OptionsPopover
      {...props}
      isSelected={(option) => value.includes(option)}
      onPick={(option) =>
        onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option])
      }
      onClear={value.length === 0 ? undefined : () => onChange([])}
    />
  );
}

function OptionsPopover<T extends string>({
  options,
  isSelected,
  onPick,
  onClear,
  closeOnPick = false,
  placeholder = "Select…",
  emptyMessage = "No results.",
  className,
  ...triggerProps
}: BaseProps<T> & {
  isSelected: (option: T) => boolean;
  onPick: (option: T) => void;
  /** Set when something is selected: shows the clear button. */
  onClear?: () => void;
  closeOnPick?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const label = options
    .filter((o) => isSelected(o.value))
    .map((o) => o.label)
    .join(", ");

  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())),
    [options, query],
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      {/* The clear affordance is a sibling of the trigger, not inside it: a
          button cannot nest in the trigger's button. */}
      <div className={cn("relative", className)}>
        <PopoverTrigger
          {...triggerProps}
          className={cn(
            buttonVariants({ variant: "outline" }),
            CONTROL_CLASS,
            "justify-between font-normal",
            !label && "text-muted-foreground",
            onClear && "pr-9",
          )}
        >
          <span className="truncate">{label || placeholder}</span>
          {!onClear && <ChevronsUpDown className="text-muted-foreground" />}
        </PopoverTrigger>
        {onClear && (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={onClear}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-0.5 hover:bg-muted"
          >
            <X className="size-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      <PopoverContent className="w-(--anchor-width) min-w-56 p-0">
        <div className="border-b border-border">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search…"
            className="border-0 shadow-none focus-visible:border-transparent focus-visible:ring-0"
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            filtered.map((option) => {
              const selected = isSelected(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onPick(option.value);
                    if (closeOnPick) setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input",
                      selected && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {selected && <Check className="size-3" />}
                  </span>
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
