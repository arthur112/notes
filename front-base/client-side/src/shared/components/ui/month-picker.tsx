import { useState } from "react";
import { Calendar } from "lucide-react";

import { buttonVariants } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { formatMonth, type Month } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";

import { PickerHeader, YearGrid } from "./year-picker";

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
const PAGE_SIZE = 12;

/** A date picker that picks whole months instead of days. */
export function MonthPicker({
  value,
  onChange,
  placeholder = "Pick a month",
  ariaLabel,
  className,
}: {
  value: Month | null;
  onChange: (month: Month) => void;
  placeholder?: string;
  /** Accessible name; the visible label lives in `FilterField`. */
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => value?.year ?? new Date().getFullYear());
  const [view, setView] = useState<"months" | "years">("months");

  const pick = (month: number) => {
    onChange({ year: viewYear, month });
    setOpen(false);
  };

  const start = Math.floor(viewYear / PAGE_SIZE) * PAGE_SIZE;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setViewYear(value?.year ?? new Date().getFullYear());
          setView("months");
        }
      }}
    >
      <PopoverTrigger
        aria-label={ariaLabel}
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
        <PickerHeader
          label={view === "months" ? String(viewYear) : `${start} – ${start + PAGE_SIZE - 1}`}
          ariaLabel="Toggle year view"
          onPrev={() => setViewYear((y) => y - (view === "months" ? 1 : PAGE_SIZE))}
          onNext={() => setViewYear((y) => y + (view === "months" ? 1 : PAGE_SIZE))}
          onLabelClick={() => setView((v) => (v === "months" ? "years" : "months"))}
        />
        {view === "months" ? (
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
        ) : (
          <YearGrid
            pageYear={viewYear}
            value={value?.year ?? null}
            onPick={(year) => {
              setViewYear(year);
              setView("months");
            }}
            className="mt-2"
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
