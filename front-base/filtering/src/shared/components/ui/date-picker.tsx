import { useState } from "react";
import { CalendarDays } from "lucide-react";

import { buttonVariants } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { formatDate } from "@/shared/lib/format";
import { todayYmd, toYmd, type Ymd } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";

import { CONTROL_CLASS, type ControlProps } from "./control";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

/**
 * The month on screen. `month` is 0-based and may overflow (-1, 12, …):
 * everything reads it through `Date.UTC`, which normalizes it.
 */
type View = { year: number; month: number };

function ymdToView(ymd: Ymd | null): View {
  const [year, month] = (ymd ?? todayYmd()).split("-").map(Number);
  return { year, month: month - 1 };
}

/** A month of day cells on a UTC grid, highlighting the inclusive `from`–`to` range. */
function MonthGrid({
  view,
  from,
  to,
  onSelectDay,
}: {
  view: View;
  from: Ymd | null;
  to: Ymd | null;
  onSelectDay: (ymd: Ymd) => void;
}) {
  const lead = (new Date(Date.UTC(view.year, view.month, 1)).getUTCDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
  const today = todayYmd();

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
        {Array.from({ length: lead }, (_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const ymd = toYmd(new Date(Date.UTC(view.year, view.month, i + 1)));
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => onSelectDay(ymd)}
              className={cn(
                "relative rounded-md py-1.5 text-sm tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground",
                ymd === today && "font-semibold text-primary",
                from &&
                  to &&
                  ymd >= from &&
                  ymd <= to &&
                  "rounded-none bg-primary/10 hover:bg-primary/15",
                (ymd === from || ymd === to) &&
                  "rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Previous / current / next month header above the grid. */
function MonthNav({ view, onShift }: { view: View; onShift: (n: number) => void }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-1">
      <button
        type="button"
        onClick={() => onShift(-1)}
        aria-label="Previous month"
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      >
        ←
      </button>
      <span className="text-sm font-medium tabular-nums">
        {new Date(Date.UTC(view.year, view.month, 1)).toLocaleString("en-GB", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })}
      </span>
      <button
        type="button"
        onClick={() => onShift(1)}
        aria-label="Next month"
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      >
        →
      </button>
    </div>
  );
}

/** Single-day picker over the same UTC calendar. */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  ...triggerProps
}: ControlProps & {
  value: Ymd | null;
  onChange: (next: Ymd | null) => void;
  placeholder?: string;
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
      <PopoverContent className="w-72 p-3" align="start">
        <MonthNav view={view} onShift={(n) => setView((v) => ({ ...v, month: v.month + n }))} />
        <MonthGrid
          view={view}
          from={value}
          to={value}
          onSelectDay={(ymd) => {
            onChange(ymd);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export type DateRange = { from: Ymd | null; to: Ymd | null };

const EMPTY_RANGE: DateRange = { from: null, to: null };

/** Two-click range picker over a UTC calendar. */
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
  const [view, setView] = useState(() => ymdToView(value.from));
  const { from, to } = value;

  const label = from
    ? to
      ? `${formatDate(from)} – ${formatDate(to)}`
      : `From ${formatDate(from)}`
    : to
      ? `Until ${formatDate(to)}`
      : null;

  const onSelectDay = (ymd: Ymd) => {
    // First pick (or a pick before `from`) starts a new range; the second closes it.
    if (!from || to || ymd < from) {
      onChange({ from: ymd, to: null });
    } else {
      onChange({ from, to: ymd });
      setOpen(false);
    }
  };

  const shiftMonth = (n: number) => setView((v) => ({ ...v, month: v.month + n }));

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setView(ymdToView(from));
      }}
    >
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
      <PopoverContent className="w-72 p-3" align="start">
        <MonthNav view={view} onShift={shiftMonth} />
        <MonthGrid view={view} from={from} to={to} onSelectDay={onSelectDay} />
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
            {from && to
              ? `${Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1} days`
              : "Pick start then end"}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
