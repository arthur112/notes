import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Years shown on one page of the year grid. */
const PAGE_SIZE = 12;

export function formatYear(year: number): string {
  return String(year);
}

type YearGridProps = {
  /** Any year on the page currently shown. */
  pageYear: number;
  value: number | null;
  onPick: (year: number) => void;
  className?: string;
};

/** A grid of `PAGE_SIZE` years around `pageYear` (shared by Month + Year pickers). */
export function YearGrid({
  pageYear,
  value,
  onPick,
  className,
}: YearGridProps) {
  const start = Math.floor(pageYear / PAGE_SIZE) * PAGE_SIZE;
  const years = Array.from({ length: PAGE_SIZE }, (_, i) => start + i);

  return (
    <div className={cn("grid grid-cols-3 gap-1", className)}>
      {years.map((year) => {
        const selected = value === year;
        const current = year === new Date().getFullYear();
        return (
          <button
            key={year}
            type="button"
            onClick={() => onPick(year)}
            className={cn(
              "rounded-md px-2 py-1.5 text-sm tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground",
              current &&
                "border border-primary text-primary hover:text-primary",
              selected &&
                "bg-primary font-medium text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            )}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
}

/** Chevron + heading row used by both pickers. `label` toggles the year view. */
export function PickerHeader({
  label,
  onPrev,
  onNext,
  onLabelClick,
  ariaLabel,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  /** When omitted, the label renders as a non-interactive span. */
  onLabelClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Previous"
        onClick={onPrev}
      >
        <ChevronLeft />
      </Button>
      {onLabelClick ? (
        <button
          type="button"
          onClick={onLabelClick}
          className="rounded-md px-2 py-0.5 text-sm font-medium tabular-nums hover:bg-accent"
          aria-label={ariaLabel}
        >
          {label}
        </button>
      ) : (
        <span className="px-2 py-0.5 text-sm font-medium tabular-nums">
          {label}
        </span>
      )}
      <Button variant="ghost" size="icon-sm" aria-label="Next" onClick={onNext}>
        <ChevronRight />
      </Button>
    </div>
  );
}

type YearPickerProps = {
  value: number | null;
  onChange: (year: number) => void;
  placeholder?: string;
  className?: string;
};

/** A popover picker that picks a single year. */
export function YearPicker({
  value,
  onChange,
  placeholder = "Pick a year",
  className,
}: YearPickerProps) {
  const [open, setOpen] = useState(false);
  const [pageYear, setPageYear] = useState(
    () => value ?? new Date().getFullYear(),
  );

  const start = Math.floor(pageYear / PAGE_SIZE) * PAGE_SIZE;

  const pick = (year: number) => {
    onChange(year);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setPageYear(value ?? new Date().getFullYear());
      }}
    >
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "justify-start font-normal",
          !value && "text-muted-foreground",
          className,
        )}
      >
        <Calendar />
        {value ? formatYear(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <PickerHeader
          label={`${start} – ${start + PAGE_SIZE - 1}`}
          onPrev={() => setPageYear((y) => y - PAGE_SIZE)}
          onNext={() => setPageYear((y) => y + PAGE_SIZE)}
        />
        <YearGrid
          pageYear={pageYear}
          value={value}
          onPick={pick}
          className="mt-2"
        />
      </PopoverContent>
    </Popover>
  );
}
