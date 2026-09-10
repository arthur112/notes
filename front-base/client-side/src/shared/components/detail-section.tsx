import type { ReactNode } from "react";

import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";

export type DetailSectionProps = {
  title: string;
  description?: string;
  /** Audit/secondary data — rendered last and visually muted. */
  muted?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * A titled card grouping 3–9 related fields (UxGuide §2). The title is the
 * scan target and the card boundary gives the eye a place to stop: with dozens
 * of fields, "go to the Fulfilment section" beats "find field 31".
 */
export function DetailSection({
  title,
  description,
  muted,
  className,
  children,
}: DetailSectionProps) {
  return (
    <Card className={cn("gap-4 py-5", muted && "bg-muted/30 text-muted-foreground", className)}>
      <div className="grid auto-rows-min items-start gap-1 px-5">
        <h2 className="text-sm leading-none font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <CardContent className="px-5">{children}</CardContent>
    </Card>
  );
}
