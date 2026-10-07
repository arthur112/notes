import { useState } from "react";
import { CalendarDays } from "lucide-react";

import { buttonVariants } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { formatDate } from "@/shared/lib/format";
import { todayYmd, type Ymd } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** A month of day cells on a UTC grid. */
export function MonthGrid({
  year,
  month,
  selected,
  rangeFrom,
  rangeTo,
  onSelectDay,
}: {
  year: number;
  month: number; // 0-based
  selected?: Ymd;
  rangeFrom?: Ymd | null;
  rangeTo?: Ymd | null;
  onSelectDay: (ymd: Ymd) => void;
}) {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lead = (firstDay.getUTCDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const today = todayYmd();

  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 pb-1 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((ymd, i) => {
          if (!ymd) return <span key={`empty-${i}`} />;
          const inRange =
            rangeFrom &&
            rangeTo &&
            ymd >= rangeFrom &&
            ymd <= rangeTo &&
            (ymd === rangeFrom || ymd === rangeTo || (ymd > rangeFrom && ymd < rangeTo));
          const isStart = rangeFrom === ymd;
          const isEnd = rangeTo === ymd;
          const isSelected = selected === ymd;
          const isToday = ymd === today;
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => onSelectDay(ymd)}
              className={cn(
                "relative rounded-md py-1.5 text-sm tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground",
                isToday && "font-semibold text-primary",
                inRange && "rounded-none bg-primary/10 hover:bg-primary/15",
                isStart &&
                  "rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                isEnd &&
                  isStart === false &&
                  "rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                isSelected &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              {Number(ymd.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Navigation header (chevrons + "Mar 2026") for a day/range picker. */
export function MonthNavHeader({
  year,
  month,
  onPrev,
  onNext,
  onToday,
}: {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  onToday?: () => void;
}) {
  const label = `${new Date(Date.UTC(year, month, 1)).toLocaleString("en-GB", { month: "short" })} ${year}`;
  return (
    <div className="mb-2 flex items-center justify-between gap-1">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous month"
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
      >
        ←
      </button>
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium tabular-nums">{label}</span>
        {onToday && (
          <button
            type="button"
            onClick={onToday}
            className="rounded-md px-1.5 py-0.5 text-xs text-primary hover:bg-accent"
          >
            Today
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next month"
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
      >
        →
      </button>
    </div>
  );
}

function ymdToView(ymd: Ymd | null | undefined): { year: number; month: number } {
  if (ymd) {
    const [y, m] = ymd.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
}

/** Single-day picker — value is a UTC `YYYY-MM-DD` string. */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
}: {
  value: Ymd | null;
  onChange: (next: Ymd | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => ymdToView(value));

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setView(ymdToView(value));
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
        <CalendarDays />
        {value ? formatDate(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <MonthNavHeader
          year={view.year}
          month={view.month}
          onPrev={() =>
            setView((v) =>
              v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 },
            )
          }
          onNext={() =>
            setView((v) =>
              v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 },
            )
          }
          onToday={() => {
            const t = todayYmd();
            onChange(t);
            setOpen(false);
          }}
        />
        <MonthGrid
          year={view.year}
          month={view.month}
          selected={value ?? undefined}
          onSelectDay={(ymd) => {
            onChange(ymd);
            setOpen(false);
          }}
        />
        {value && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export type DateRange = { from: Ymd | null; to: Ymd | null };

const EMPTY_RANGE: DateRange = { from: null, to: null };

/** Two-click range picker over the same UTC calendar. */
export function DateRangePicker({
  value = EMPTY_RANGE,
  onChange,
  placeholder = "Pick a period",
  ariaLabel,
  className,
}: {
  value?: DateRange;
  onChange: (next: DateRange) => void;
  placeholder?: string;
  /** Accessible name; the visible label lives in `FilterField`. */
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => ymdToView(value.from));

  const label = value.from
    ? value.to
      ? `${formatDate(value.from)} – ${formatDate(value.to)}`
      : `From ${formatDate(value.from)}`
    : value.to
      ? `Until ${formatDate(value.to)}`
      : null;

  const onSelectDay = (ymd: Ymd) => {
    const from = value.from;
    const to = value.to;
    if (!from || (from && to)) {
      onChange({ from: ymd, to: null });
    } else if (ymd < from) {
      onChange({ from: ymd, to: null });
    } else {
      onChange({ from, to: ymd });
      // keep the popover open so the user sees the range, close on second pick
      setOpen(false);
    }
  };

  const clear = () => {
    onChange(EMPTY_RANGE);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          const initial = ymdToView(value.from);
          setView(initial);
        }
      }}
    >
      <PopoverTrigger
        aria-label={ariaLabel}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "justify-start font-normal",
          !label && "text-muted-foreground",
          className,
        )}
      >
        <CalendarDays />
        <span className="truncate">{label ?? placeholder}</span>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <MonthNavHeader
          year={view.year}
          month={view.month}
          onPrev={() =>
            setView((v) =>
              v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 },
            )
          }
          onNext={() =>
            setView((v) =>
              v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 },
            )
          }
        />
        <MonthGrid
          year={view.year}
          month={view.month}
          rangeFrom={value.from}
          rangeTo={value.to}
          onSelectDay={onSelectDay}
        />
        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <button
            type="button"
            onClick={clear}
            disabled={!value.from && !value.to}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            Clear
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {value.from && value.to
              ? `${Math.round((new Date(value.to).getTime() - new Date(value.from).getTime()) / 86_400_000) + 1} days`
              : "Pick start then end"}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
