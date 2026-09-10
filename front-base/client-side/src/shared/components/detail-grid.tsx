import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

export type DetailGridProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Responsive field grid (1 / 2 / 3 columns) — the container every DetailField
 * lives in. Columns collapse in the same order at every breakpoint, so mobile
 * stacks sections exactly the way desktop shows them.
 */
export function DetailGrid({ children, className }: DetailGridProps) {
  return (
    <div
      className={cn("grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-3", className)}
    >
      {children}
    </div>
  );
}
