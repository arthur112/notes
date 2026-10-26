import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { formatDate } from "@/shared/lib/format";
import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getISODay,
  isSameDay,
  isSameMonth,
  isThisMonth,
  isToday,
  setMonth,
  startOfMonth,
} from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";

import { CONTROL_CLASS, type ControlProps } from "./control";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

const NAV_CLASS = buttonVariants({ variant: "ghost", size: "icon-sm" });

const SELECTED_CLASS =
  "rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground";

/** Local-midnight days, react-day-picker's shape. */
export type DateRange = { from: Date | undefined; to?: Date };

/** A month of day cells, highlighting the inclusive `from`–`to` range. */
function MonthGrid({
  month,
  from,
  to,
  onSelectDay,
}: {
  month: Date;
  from?: Date;
  to?: Date;
  onSelectDay: (day: Date) => void;
}) {
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
        {Array.from({ length: getISODay(month) - 1 }, (_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {eachDayOfInterval({ start: month, end: endOfMonth(month) }).map((day) => (
          <button
            key={day.getTime()}
            type="button"
            onClick={() => onSelectDay(day)}
            className={cn(
              "relative rounded-md py-1.5 text-sm tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground",
              isToday(day) && "font-semibold text-primary",
              from &&
                to &&
                day >= from &&
                day <= to &&
                "rounded-none bg-primary/10 hover:bg-primary/15",
              ((from && isSameDay(day, from)) || (to && isSameDay(day, to))) && SELECTED_CLASS,
            )}
          >
            {format(day, "d")}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The year's twelve months; picking one goes back to its days. */
function MonthSelector({ view, onSelect }: { view: Date; onSelect: (month: Date) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {Array.from({ length: 12 }, (_, i) => {
        const month = setMonth(view, i);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(month)}
            className={cn(
              "rounded-md py-3 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
              isThisMonth(month) && "font-semibold text-primary",
              isSameMonth(month, view) && SELECTED_CLASS,
            )}
          >
            {format(month, "MMM")}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The calendar both pickers share: `months` day grids side by side (the second
 * one from `sm` up), or, after a click on a month's caption, that year's months.
 * It mounts with its popover, so each opening starts on `from` (or today).
 */
function Calendar({
  months,
  from,
  to,
  onSelectDay,
}: {
  months: 1 | 2;
  from?: Date;
  to?: Date;
  onSelectDay: (day: Date) => void;
}) {
  const [view, setView] = useState(() => startOfMonth(from ?? new Date()));
  const [choosingMonth, setChoosingMonth] = useState(false);
  const [step, unit] = choosingMonth ? [12, "year"] : [1, "month"];

  return (
    <div className={cn("relative w-64", months === 2 && "sm:w-[33rem]")}>
      <button
        type="button"
        onClick={() => setView((v) => addMonths(v, -step))}
        aria-label={`Previous ${unit}`}
        className={cn(NAV_CLASS, "absolute top-0 left-0")}
      >
        <ChevronLeft />
      </button>
      <button
        type="button"
        onClick={() => setView((v) => addMonths(v, step))}
        aria-label={`Next ${unit}`}
        className={cn(NAV_CLASS, "absolute top-0 right-0")}
      >
        <ChevronRight />
      </button>
      {choosingMonth ? (
        <>
          <div className="mb-2 flex h-7 items-center justify-center text-sm font-medium tabular-nums">
            {format(view, "yyyy")}
          </div>
          <MonthSelector
            view={view}
            onSelect={(month) => {
              setView(month);
              setChoosingMonth(false);
            }}
          />
        </>
      ) : (
        <div className="flex gap-4">
          {Array.from({ length: months }, (_, i) => {
            const shown = addMonths(view, i);
            return (
              <div key={i} className={cn("w-64", i > 0 && "hidden sm:block")}>
                <div className="mb-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setView(shown);
                      setChoosingMonth(true);
                    }}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "tabular-nums")}
                  >
                    {format(shown, "MMM yyyy")}
                    <ChevronDown className="opacity-50" />
                  </button>
                </div>
                <MonthGrid month={shown} from={from} to={to} onSelectDay={onSelectDay} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Single-day picker over the same calendar. */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  ...triggerProps
}: ControlProps & {
  value: Date | null;
  onChange: (next: Date) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        {...triggerProps}
        className={cn(
          buttonVariants({ variant: "outline" }),
          CONTROL_CLASS,
          "justify-start font-normal",
          !value && "text-muted-foreground",
          className,
        )}
      >
        <CalendarDays />
        <span className="truncate">{value ? formatDate(value) : placeholder}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <Calendar
          months={1}
          from={value ?? undefined}
          to={value ?? undefined}
          onSelectDay={(day) => {
            onChange(day);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

const EMPTY_RANGE: DateRange = { from: undefined };

/** Two-click range picker over two months. */
export function DateRangePicker({
  value = EMPTY_RANGE,
  onChange,
  placeholder = "Pick a period",
  className,
  ...triggerProps
}: ControlProps & {
  value?: DateRange;
  onChange: (next: DateRange) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const { from, to } = value;

  const label = from
    ? to
      ? `${formatDate(from)} – ${formatDate(to)}`
      : `From ${formatDate(from)}`
    : to
      ? `Until ${formatDate(to)}`
      : null;

  const onSelectDay = (day: Date) => {
    // First pick (or a pick before `from`) starts a new range; the second closes it.
    if (!from || to || day < from) {
      onChange({ from: day });
    } else {
      onChange({ from, to: day });
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        {...triggerProps}
        className={cn(
          buttonVariants({ variant: "outline" }),
          CONTROL_CLASS,
          "justify-start font-normal",
          !label && "text-muted-foreground",
          className,
        )}
      >
        <CalendarDays />
        <span className="truncate">{label ?? placeholder}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <Calendar months={2} from={from} to={to} onSelectDay={onSelectDay} />
        <div className="mt-2 flex items-center justify-between border-t pt-2">
          <button
            type="button"
            onClick={() => {
              onChange(EMPTY_RANGE);
              setOpen(false);
            }}
            disabled={!from && !to}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            Clear
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {from && to ? `${differenceInCalendarDays(to, from) + 1} days` : "Pick start then end"}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
