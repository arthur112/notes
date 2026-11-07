import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/**
 * A filter control with a **visible label above it**. The label survives value
 * selection, which is the whole point: a placeholder is not a label (WCAG
 * 3.3.2), so a set filter must still say which field it belongs to.
 */
export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
