import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";

/**
 * The single "Filters (n)" affordance: low-frequency controls live behind one
 * button instead of stretching the toolbar. The `n` badge is the honest count
 * of what is currently narrowing the result set inside.
 */
export function FilterPopover({
  activeCount,
  onClear,
  children,
  className,
}: {
  activeCount: number;
  onClear: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" className={className} />}
        aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"}
      >
        <SlidersHorizontal />
        Filters
        {activeCount > 0 && (
          <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
            {activeCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <div className="grid gap-4">{children}</div>
        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {activeCount === 0 ? "No filters applied" : `${activeCount} active`}
          </span>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={activeCount === 0}>
            Clear all filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
