import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** A (year, month) pair — `month` is 0-based, like `Date#getMonth()`. */
export type Month = { year: number; month: number };

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatMonth(month: Month): string {
  return `${MONTH_NAMES[month.month]} ${month.year}`;
}

type MonthPickerProps = {
  value: Month | null;
  onChange: (month: Month) => void;
  placeholder?: string;
  className?: string;
};

/** A date picker that picks whole months instead of days. */
export function MonthPicker({
  value,
  onChange,
  placeholder = "Pick a month",
  className,
}: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    () => value?.year ?? new Date().getFullYear(),
  );

  const pick = (month: number) => {
    onChange({ year: viewYear, month });
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setViewYear(value?.year ?? new Date().getFullYear());
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
        {value ? formatMonth(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous year"
            onClick={() => setViewYear((y) => y - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="text-sm font-medium tabular-nums">{viewYear}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next year"
            onClick={() => setViewYear((y) => y + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {MONTH_NAMES.map((name, i) => {
            const selected = value?.year === viewYear && value.month === i;
            return (
              <button
                key={name}
                type="button"
                onClick={() => pick(i)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  selected &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
