import { cn } from "@/shared/lib/utils";
import { formatDateTime } from "@/shared/lib/format";

import type { ActivityEntry, ActivityTone } from "../types/order-activity";

const TONE_DOT: Record<ActivityTone, string> = {
  neutral: "bg-muted-foreground/50",
  info: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-destructive",
};

/**
 * The `Activity` tab: the order's audit trail as a newest-first timeline. Dumb —
 * it receives already-merged entries (see `buildOrderActivity`) and renders
 * them, so auditing is a distinct view from reading the record's fields.
 */
export function OrderActivity({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity recorded for this order yet.</p>
    );
  }

  return (
    <ol className="relative space-y-5 border-l border-border pl-6">
      {entries.map((entry, index) => (
        <li key={`${entry.at}:${index}`} className="relative">
          <span
            className={cn(
              "absolute top-1.5 -left-6 size-2.5 -translate-x-1/2 rounded-full ring-4 ring-card",
              TONE_DOT[entry.tone],
            )}
            aria-hidden
          />
          <p className="text-sm font-medium">{entry.label}</p>
          {entry.detail && <p className="text-sm text-muted-foreground">{entry.detail}</p>}
          <time
            dateTime={entry.at}
            className="mt-0.5 block text-xs text-muted-foreground tabular-nums"
          >
            {formatDateTime(entry.at)}
          </time>
        </li>
      ))}
    </ol>
  );
}
