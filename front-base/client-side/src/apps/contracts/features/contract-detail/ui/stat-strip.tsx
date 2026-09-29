import type { ReactNode } from "react";

/**
 * A label-over-big-value strip (4-up on desktop, 2-up on mobile) — the
 * lending desk's key-facts band. Values use tabular figures so amounts line
 * up across the strip. Dumb: stats in, markup out.
 */
export type Stat = {
  label: string;
  value: ReactNode;
  /** Supporting line under the value (e.g. "of 300 · 10.7% elapsed"). */
  hint?: ReactNode;
};

export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {stat.label}
          </dt>
          <dd className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
            {stat.value}
          </dd>
          {stat.hint && <dd className="mt-1 text-sm text-muted-foreground">{stat.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
