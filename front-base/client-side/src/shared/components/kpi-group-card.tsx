import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

/**
 * Expressive, dumb KPI tile: one semantic group of metrics, not a single
 * number. The first metric is the group's headline (larger) and carries an
 * optional year-over-year meter, so the group's progress is legible at a glance
 * rather than having to be inferred from a percentage. The rest render as a
 * compact label / value / YoY-delta list.
 *
 * Controlled entirely by props — no fetching, no domain knowledge — so any app
 * can render its own semantic groups with it.
 */

export type KpiDeltaUnit = "percent" | "points";

/** `points` = percentage-point change, for shares and rates. */
export type KpiDelta = { value: number; unit: KpiDeltaUnit } | null;

/** Which direction is good, for colouring the delta. Defaults to `up-good`. */
export type KpiSentiment = "up-good" | "down-good" | "neutral";

export type KpiMetric = {
  key: string;
  label: string;
  /** Pre-formatted value; `undefined` renders the loading skeleton. */
  value: string | undefined;
  delta?: KpiDelta;
  sentiment?: KpiSentiment;
};

/**
 * Year-over-year progress for a group's headline: both periods scaled against
 * the larger of them, plus a change figure.
 */
export type KpiProgress = {
  /** Headline value as a share of the larger period, in [0, 1]. */
  currentShare: number;
  /** Baseline value on the same scale, in [0, 1] — drawn as a tick. */
  previousShare: number;
  currentLabel: string;
  previousLabel: string;
  /**
   * Change text complementing the delta badge — the absolute change for a money
   * or count metric, the relative one for a rate or share. Omitted when it is not
   * derivable (a zero baseline has no relative change).
   */
  change?: string;
};

export type KpiGroupCardProps = {
  title: string;
  icon: LucideIcon;
  headline: KpiMetric;
  rows: KpiMetric[];
  /** Headline year-over-year meter; the card renders without it when omitted. */
  progress?: KpiProgress;
  /** Small note in the card header, e.g. "vs 2025". */
  comparison?: string;
};

function formatDelta(delta: KpiDelta): string {
  if (!delta || !Number.isFinite(delta.value)) return "—";
  const rounded = Math.round(delta.value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}${delta.unit === "points" ? " pts" : "%"}`;
}

function deltaTone(delta: KpiDelta, sentiment: KpiSentiment): string {
  if (!delta || !Number.isFinite(delta.value) || delta.value === 0) return "text-muted-foreground";
  if (sentiment === "neutral") return "text-muted-foreground";
  const positive = sentiment === "up-good" ? delta.value > 0 : delta.value < 0;
  return positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive";
}

function DeltaBadge({
  delta,
  sentiment,
  icon = true,
}: {
  delta: KpiDelta;
  sentiment?: KpiSentiment;
  icon?: boolean;
}) {
  const resolved = delta && Number.isFinite(delta.value) ? Math.round(delta.value * 10) / 10 : null;
  const moving = resolved !== null && resolved !== 0;
  const Icon = (resolved ?? 0) > 0 ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        deltaTone(delta, sentiment ?? "up-good"),
      )}
    >
      {icon && moving && <Icon className="size-3.5" />}
      {formatDelta(delta)}
    </span>
  );
}

function MetricValue({ value, className }: { value: string | undefined; className: string }) {
  if (value === undefined) return <Skeleton className={cn("h-5 w-16", className)} />;
  return <span className={cn("font-medium tabular-nums", className)}>{value}</span>;
}

/**
 * One bar, one tick. The filled bar is this year scaled against the larger of
 * the two periods; the tick marks last year on that same scale. Deliberately not
 * two bars: a single bar still reads as a single magnitude, and a bare tick is
 * the least ink that can carry "where the baseline sat".
 */
function YoyMeter({ progress }: { progress: KpiProgress }) {
  return (
    <div className="mt-3">
      <span className="relative block h-1.5 w-full rounded-full bg-muted">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: `${progress.currentShare * 100}%` }}
        />
        <span
          className="absolute -inset-y-0.5 w-0.5 rounded-full bg-foreground/70"
          style={{ left: `calc(${progress.previousShare * 100}% - 1px)` }}
        />
      </span>
      <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-3 rounded-full bg-primary" />
          {progress.currentLabel}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-0.5 rounded-full bg-foreground/70" />
          {progress.previousLabel}
        </span>
        {/* The complementary figure, so the badge's percentage is never the only
            number: "+12%" on €4k and on €4M are not the same story. */}
        {progress.change && (
          <span className="ml-auto shrink-0 tabular-nums">{progress.change}</span>
        )}
      </div>
    </div>
  );
}

export function KpiGroupCard({
  title,
  icon: Icon,
  headline,
  rows,
  progress,
  comparison,
}: KpiGroupCardProps) {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="flex h-full flex-col px-5">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-3.5" />
          </span>
          <span className="truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {title}
          </span>
          {comparison && (
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">{comparison}</span>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{headline.label}</p>
            {headline.value === undefined ? (
              <Skeleton className="mt-1 h-7 w-24" />
            ) : (
              <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums">
                {headline.value}
              </p>
            )}
          </div>
          <DeltaBadge delta={headline.delta ?? null} sentiment={headline.sentiment} />
        </div>

        {progress && <YoyMeter progress={progress} />}

        <Separator className="my-4" />

        <ul className="mt-auto space-y-2.5">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-1.5 text-sm">
              <span className="truncate text-muted-foreground">{row.label}</span>
              <span className="ml-auto shrink-0">
                <MetricValue value={row.value} className="text-sm" />
              </span>
              <span className="w-14 shrink-0 text-right">
                <DeltaBadge delta={row.delta ?? null} sentiment={row.sentiment} icon={false} />
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
