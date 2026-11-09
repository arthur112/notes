import { cn } from "@/shared/lib/utils";

const GRADE_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

/** Green → red ramp across the A–F scale. */
const GRADE_COLORS = [
  "bg-emerald-500",
  "bg-lime-600",
  "bg-yellow-400",
  "bg-amber-500",
  "bg-orange-600",
  "bg-red-600",
] as const;

export type RiskSummaryProps = RiskGradeScaleProps & {
  grade: string;
  band: string;
  /** The value score, 0–100: independent of the grade, shown as a figure, not a second scale. */
  value: number;
  valueBand: string;
};

/**
 * The group's header: two independent readings side by side, the grade as a coloured tile on the
 * left, the value score as a plain figure on the right, then the single A–F scale under them. One
 * gradient per section: a second bar for the value would compete with the grade and invert its
 * direction (A is good, 100 is good), so the value stays a number.
 */
export function RiskSummary({ grade, band, value, valueBand, ...scale }: RiskSummaryProps) {
  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-lg text-xl font-semibold text-white",
            GRADE_COLORS[scale.activeIndex],
          )}
        >
          {grade}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{band} risk</p>
          <p className="text-xs text-muted-foreground">Grade {grade} on A–F</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm tabular-nums">
            <span className="text-xl font-semibold tracking-tight">{value}</span>
            <span className="text-muted-foreground"> / 100</span>
          </p>
          <p className="text-xs text-muted-foreground">Value score · {valueBand}</p>
        </div>
      </div>
      <RiskGradeScale {...scale} />
    </div>
  );
}

export type RiskGradeScaleProps = {
  /** 0-based index into the A–F scale. */
  activeIndex: number;
  /** Announced scale summary, e.g. "B+ (Upper medium)". */
  label: string;
};

/**
 * The A–F risk scale: six coloured segments, the active one ringed and marked
 * with a triangle, letters below. Purely presentational — the whole scale is
 * one `role="img"` with a text label so screen readers hear the grade, not
 * six meaningless bars.
 */
export function RiskGradeScale({ activeIndex, label }: RiskGradeScaleProps) {
  return (
    <div role="img" aria-label={`Risk grade ${label} on an A to F scale`}>
      <div className="flex gap-1">
        {GRADE_LETTERS.map((letter, index) => {
          const active = index === activeIndex;
          return (
            <div key={letter} className="flex-1">
              <div className="flex h-3 items-end justify-center">
                {active && (
                  <span
                    aria-hidden
                    className="h-0 w-0 border-x-6 border-t-8 border-x-transparent border-t-foreground"
                  />
                )}
              </div>
              <div
                className={cn(
                  "h-1.5 rounded-full",
                  GRADE_COLORS[index],
                  active && "ring-2 ring-foreground/80 ring-offset-2 ring-offset-background",
                )}
              />
              <div
                className={cn(
                  "mt-1.5 text-center text-xs",
                  active ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {letter}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
