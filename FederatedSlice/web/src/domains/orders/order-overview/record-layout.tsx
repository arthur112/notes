import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";

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

/**
 * A page section: heading with a muted note on the right, then a rule. The whole
 * heading row toggles it (open by default); the chevron is only its affordance.
 */
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
    <Collapsible defaultOpen render={<section aria-labelledby={id} />}>
      <div className="space-y-6">
        <h2>
          <CollapsibleTrigger className="group flex w-full items-center gap-x-6 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:outline-none">
            <span id={id} className="text-xl font-semibold tracking-tight">
              {title}
            </span>
            <span className="ml-auto text-sm text-muted-foreground">{note}</span>
            <span
              aria-hidden
              className="grid size-7 shrink-0 place-items-center rounded-full border text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground"
            >
              <ChevronDown className="size-4 transition-transform duration-200 group-data-panel-open:rotate-180" />
            </span>
          </CollapsibleTrigger>
        </h2>
        <Separator />
      </div>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
        <div className="space-y-6 pt-6">{children}</div>
      </CollapsibleContent>
    </Collapsible>
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
