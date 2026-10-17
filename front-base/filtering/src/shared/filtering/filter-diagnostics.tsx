import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";

import { cn } from "@/shared/lib/utils";

import type { FilterDefinition, FilterFieldMap, FilterSearch, SortFieldMap } from "./definition";
import type { RequestLogEntry } from "./request-log";

/**
 * The inspection panels every filtered list shows: the URL, the Gridify query
 * it produces, the requests the mock received, the page's rows (children),
 * and the settled search. Keeping them here means a second domain gets the
 * same debugging view without copying it.
 */
export function FilterDiagnostics<M extends FilterFieldMap, S extends SortFieldMap>({
  definition,
  search,
  log,
  isFetching,
  isError,
  children,
}: {
  definition: FilterDefinition<M, S>;
  search: FilterSearch<M>;
  log: readonly RequestLogEntry[];
  isFetching: boolean;
  isError: boolean;
  /** The rows section, shown between the requests and the validated search. */
  children: ReactNode;
}) {
  const href = useLocation({ select: (location) => location.href });
  const gridifyQuery = definition.toGridifyQuery(search);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-medium">URL</h2>
        <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm">{href}</pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Gridify query</h2>
        <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm">
          {JSON.stringify(gridifyQuery, null, 2)}
        </pre>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">Requests</h2>
          <span
            role="status"
            className={cn(
              "rounded-full px-2 py-0.5 text-xs",
              isFetching ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {isFetching ? "Fetching…" : isError ? "Error" : "Idle"}
          </span>
        </div>
        <ol className="divide-y rounded-lg border text-sm">
          {log.length === 0 ? (
            <li className="px-4 py-3 text-muted-foreground">No request yet.</li>
          ) : (
            log.map((entry) => (
              <li key={entry.requestNo} className="flex gap-3 px-4 py-2">
                <span className="w-8 shrink-0 text-muted-foreground tabular-nums">
                  #{entry.requestNo}
                </span>
                <span className="w-20 shrink-0 text-muted-foreground tabular-nums">
                  {entry.receivedAt.slice(11, 19)}
                </span>
                <code className="min-w-0 break-all">{entry.query}</code>
              </li>
            ))
          )}
        </ol>
      </section>

      {children}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Validated search</h2>
        <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs">
          {JSON.stringify(search, null, 2)}
        </pre>
      </section>
    </div>
  );
}
