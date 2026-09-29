import type { ReactNode } from "react";

/**
 * Label-left / value-right row for dense read views — the lending desk's
 * field layout (unlike the order apps' label-over-value `DetailField`, long
 * financial labels scan better against right-aligned values). Dumb.
 */
export function SpecRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-8 py-2">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium break-words">{value}</dd>
    </div>
  );
}

/** A titled group of SpecRows — the title is the scan target (UxGuide §2). */
export function SpecGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold tracking-wide text-primary uppercase">{title}</h3>
      <dl className="mt-1">{children}</dl>
    </section>
  );
}
