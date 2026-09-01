import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type MultiSelectOption = { value: string; label: string };

type MultiSelectProps = {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
};

/** A multi-select with an in-popup search field and a clear-all button. */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  className,
}: MultiSelectProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      options.filter((o) =>
        o.label.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [options, query],
  );

  const toggle = (optionValue: string) =>
    onChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue],
    );

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) setQuery("");
      }}
    >
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "justify-between font-normal",
          value.length === 0 && "text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">
          {value.length === 0 ? placeholder : `${value.length} selected`}
        </span>
        <ChevronsUpDown className="text-muted-foreground" />
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
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No results.
            </p>
          ) : (
            filtered.map((option) => {
              const selected = value.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggle(option.value)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input",
                      selected &&
                        "border-primary bg-primary text-primary-foreground",
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
        <Separator />
        <div className="flex items-center justify-between p-2">
          <span className="px-1 text-xs text-muted-foreground tabular-nums">
            {value.length} of {options.length} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
            disabled={value.length === 0}
          >
            <X />
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
