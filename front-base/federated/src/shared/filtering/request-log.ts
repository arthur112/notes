import type { IGridifyQuery } from "gridify-client";

/**
 * The mock APIs' request log: what a filtered list's "Requests" panel reads.
 * Kept here so both domains log the same way and the panel stays generic.
 */

export type RequestLogEntry = {
  /** Increments on every call that reaches the "server". */
  requestNo: number;
  /** The Gridify query the server received, as its query string. */
  query: string;
  receivedAt: string;
};

export type RequestLog = {
  record: (entry: RequestLogEntry) => void;
  subscribe: (listener: () => void) => () => void;
  /** Stable until the next `record`: what `useSyncExternalStore` needs. */
  getSnapshot: () => readonly RequestLogEntry[];
};

/** Newest first, capped, with subscribers for `useSyncExternalStore`. */
export function createRequestLog(limit = 10): RequestLog {
  let entries: RequestLogEntry[] = [];
  const listeners = new Set<() => void>();
  return {
    record(entry) {
      entries = [entry, ...entries].slice(0, limit);
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => entries,
  };
}

/** Unencoded, for reading: `page=1&pageSize=5&orderBy=total desc&filter=status=paid`. */
export function toQueryString(query: IGridifyQuery): string {
  return Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

/**
 * `"total desc, customer.name"` → a comparator over the mock rows. Each map
 * entry is a Gridify field name → the row value it orders by; unknown fields
 * are ignored.
 */
export function compareBy<T>(
  orderBy: string | undefined,
  fields: Record<string, (row: T) => string | number>,
): (a: T, b: T) => number {
  const accessors = (orderBy ?? "")
    .split(",")
    .map((part) => part.trim().split(/\s+/))
    .filter(([field]) => field in fields)
    .map(([field, direction]) => ({
      valueOf: fields[field],
      sign: direction === "desc" ? -1 : 1,
    }));
  return (a, b) => {
    for (const { valueOf, sign } of accessors) {
      const left = valueOf(a);
      const right = valueOf(b);
      if (left < right) return -sign;
      if (left > right) return sign;
    }
    return 0;
  };
}
