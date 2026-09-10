import type { ReactNode } from "react";

export type DetailFieldProps = {
  label: string;
  value?: ReactNode;
};

/**
 * One label-over-value pair for a dense read view (UxGuide §2). Label *above*
 * value — not beside it — keeps long values readable and mirrors the form
 * layout, so recognition survives the jump between reading and editing.
 */
export function DetailField({ label, value }: DetailFieldProps) {
  const empty = value === undefined || value === null || value === "";
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm break-words">{empty ? "—" : value}</div>
    </div>
  );
}
