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
    <div role="img" aria-label={`Risk grade ${label} on an A to F scale`} className="py-2">
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
