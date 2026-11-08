import type { IGridifyQuery, Paging } from "gridify-client";

import { toQueryString, type RequestLog } from "@/shared/filtering/request-log";
import type { ApiResult, ProblemDetails } from "@/shared/lib/problem";

/**
 * The calls to the .NET API. Every URL is relative (`/api/…`): Vite proxies it to the
 * api resource Aspire started (`vite.config.ts`), so the browser stays on one origin.
 */

/** A read. Any failure (404, 500, network down) throws, for the query's or route's error state. */
export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(await failureMessage(response));
  return (await response.json()) as T;
}

/**
 * A write. A 4xx problem+json (400 validation, 404) is an expected failure, so it comes
 * back as a value; anything else unexpected throws.
 */
export async function sendJson<T>(
  method: "POST" | "PUT",
  url: string,
  body: unknown,
): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.ok) return { ok: true, data: (await response.json()) as T };
  if (response.status < 500 && isProblem(response)) {
    return { ok: false, problem: (await response.json()) as ProblemDetails };
  }
  throw new Error(await failureMessage(response));
}

/**
 * `GET {url}?page=…&pageSize=…&orderBy=…&filter=…`: one page and the total count
 * (`PagedResult<T>`, the same shape as Gridify's `Paging<T>`). Recorded in `log`
 * for the list's Requests panel.
 */
export async function getPage<T>(
  url: string,
  query: IGridifyQuery,
  log: RequestLog,
): Promise<Paging<T>> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const page = await getJson<Paging<T>>(`${url}?${params}`);
  log.record(toQueryString(query));
  return page;
}

function isProblem(response: Response): boolean {
  return response.headers.get("content-type")?.includes("application/problem+json") ?? false;
}

async function failureMessage(response: Response): Promise<string> {
  const problem = isProblem(response)
    ? ((await response.json()) as ProblemDetails)
    : undefined;
  return problem?.title ?? `${response.status} ${response.statusText}`;
}
