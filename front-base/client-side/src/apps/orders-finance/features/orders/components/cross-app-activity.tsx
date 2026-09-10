import { Activity } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { useShell } from "@/shell/ShellProvider";

/**
 * Reads the shell event bus and shows what the OTHER apps did — the Finance
 * team watches the order desk live without sharing any component with it.
 */
export function CrossAppActivity() {
  const { events } = useShell();
  const others = events
    .filter((e) => e.source !== "orders-finance")
    .slice(-8)
    .reverse();

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0 p-4 pb-2">
        <Activity className="size-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">Live activity</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing yet — open an order in the Ops app and watch it appear here.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {others.map((event) => (
              <li key={event.id} className="flex items-start gap-2 text-sm">
                <Badge
                  variant="secondary"
                  className="mt-0.5 shrink-0 font-mono text-[10px] uppercase"
                >
                  {event.source}
                </Badge>
                <div className="min-w-0">
                  <p className="truncate text-foreground">{event.message}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {event.at.toLocaleTimeString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
