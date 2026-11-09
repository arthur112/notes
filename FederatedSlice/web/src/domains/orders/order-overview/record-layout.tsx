import type { ReactNode } from "react";

/**
 * The record page's building blocks, from the lending desk's contract page:
 * a big-figure stat strip, titled sections, and label-left / value-right rows.
 * All dumb: values in, markup out.
 */

export function Separator() {
  return <div role="separator" className="h-px bg-border" />;
}

export type Stat = {
  label: string;
  value: ReactNode;
  /** Supporting line under the value (e.g. "of 300 · 10.7% elapsed"). */
  hint?: ReactNode;
};

/** 4-up on desktop, 2-up on mobile; tabular figures so amounts line up across the strip. */
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

/** A page section: heading with a muted note on the right, then a rule. */
export function RecordSection({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6" aria-labelledby={id}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id={id} className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
      <Separator />
      {children}
    </section>
  );
}

/** Long labels scan better against right-aligned values than in a label-over-value grid. */
export function SpecRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-8 py-2">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium break-words">{value}</dd>
    </div>
  );
}

/** A titled group of SpecRows: the title is the scan target. */
export function SpecGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold tracking-wide text-primary uppercase">{title}</h3>
      <dl className="mt-1">{children}</dl>
    </section>
  );
}
