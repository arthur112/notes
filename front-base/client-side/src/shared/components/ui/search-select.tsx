import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";

import { buttonVariants } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";

import type { MultiSelectOption } from "./multi-select";

export type { MultiSelectOption };
export type { MultiSelectOption as SearchSelectOption };

export type SearchSelectProps = {
  options: MultiSelectOption[];
  value: string | null;
  onChange: (next: string | null) => void;
  placeholder?: string;
  /** Shown when the query matches nothing (default: "No results."). */
  emptyMessage?: string;
  /** Accessible name; the visible label lives in `FilterField`. */
  ariaLabel?: string;
  className?: string;
};

/** Single-value searchable select (combobox) built on the same primitives as MultiSelect. */
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  emptyMessage = "No results.",
  ariaLabel,
  className,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())),
    [options, query],
  );

  const pick = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        aria-label={ariaLabel}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "justify-between font-normal",
          !selected && "text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        {selected ? (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={(event) => {
              event.stopPropagation();
              onChange(null);
            }}
            className="rounded-full p-0.5 hover:bg-muted"
          >
            <X className="size-3.5 text-muted-foreground" />
          </button>
        ) : (
          <ChevronsUpDown className="text-muted-foreground" />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) min-w-56 p-0">
        <div className="relative border-b border-border">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="border-0 pl-9 shadow-none focus-visible:border-transparent focus-visible:ring-0"
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            filtered.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => pick(option.value)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input",
                      isSelected && "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {isSelected && <Check className="size-3" />}
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
