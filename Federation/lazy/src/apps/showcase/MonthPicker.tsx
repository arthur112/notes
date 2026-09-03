import { useState } from "react";
import { Calendar } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
        Popover,
        PopoverContent,
        PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { PickerHeader, YearGrid } from "./YearPicker";

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

/** Years shown on one page of the year view. */
const PAGE_SIZE = 12;

export function formatMonth(month: Month): string {
        return `${MONTH_NAMES[month.month]} ${month.year}`;
}

type MonthPickerProps = {
        value: Month | null;
        onChange: (month: Month) => void;
        placeholder?: string;
        className?: string;
};

/**
 * A date picker that picks whole months instead of days.
 * Like the MUI date picker, the header year toggles between the month grid
 * and a year grid (chevrons step by year in months, by page in years).
 */
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
                                        setViewYear(
                                                value?.year ??
                                                        new Date().getFullYear(),
                                        );
                                        setView("months");
                                }
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
                                <PickerHeader
                                        label={
                                                view === "months"
                                                        ? String(viewYear)
                                                        : `${start} – ${start + PAGE_SIZE - 1}`
                                        }
                                        ariaLabel="Toggle year view"
                                        onPrev={() =>
                                                setViewYear(
                                                        (y) =>
                                                                y -
                                                                (view ===
                                                                "months"
                                                                        ? 1
                                                                        : PAGE_SIZE),
                                                )
                                        }
                                        onNext={() =>
                                                setViewYear(
                                                        (y) =>
                                                                y +
                                                                (view ===
                                                                "months"
                                                                        ? 1
                                                                        : PAGE_SIZE),
                                                )
                                        }
                                        onLabelClick={() =>
                                                setView((v) =>
                                                        v === "months"
                                                                ? "years"
                                                                : "months",
                                                )
                                        }
                                />
                                {view === "months" ? (
                                        <div className="mt-2 grid grid-cols-3 gap-1">
                                                {MONTH_NAMES.map((name, i) => {
                                                        const selected =
                                                                value?.year ===
                                                                        viewYear &&
                                                                value.month ===
                                                                        i;
                                                        return (
                                                                <button
                                                                        key={
                                                                                name
                                                                        }
                                                                        type="button"
                                                                        onClick={() =>
                                                                                pick(
                                                                                        i,
                                                                                )
                                                                        }
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
