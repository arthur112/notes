import type { IGridifyQuery } from "gridify-client";

/**
 * The list APIs' request log: what a filtered list's "Requests" panel reads.
 * Kept here so both domains log the same way and the panel stays generic.
 */

export type RequestLogEntry = {
  /** Increments on every list call that came back. */
  requestNo: number;
  /** The Gridify query the server received, as its query string. */
  query: string;
  receivedAt: string;
};

export type RequestLog = {
  record: (query: string) => void;
  subscribe: (listener: () => void) => () => void;
  /** Stable until the next `record`: what `useSyncExternalStore` needs. */
  getSnapshot: () => readonly RequestLogEntry[];
};

/** Newest first, capped, with subscribers for `useSyncExternalStore`. */
export function createRequestLog(limit = 10): RequestLog {
  let entries: RequestLogEntry[] = [];
  let requestNo = 0;
  const listeners = new Set<() => void>();
  return {
    record(query) {
      const entry = { requestNo: ++requestNo, query, receivedAt: new Date().toISOString() };
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

/** Unencoded, for reading: `page=1&pageSize=5&orderBy=total desc&filter=status=Paid`. */
export function toQueryString(query: IGridifyQuery): string {
  return Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}
