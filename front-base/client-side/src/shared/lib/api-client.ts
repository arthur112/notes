import { handleMockRequest, MockHttpError } from "./mock/server";

/**
 * Generic request transport used by every endpoint module. Today it talks to
 * the in-memory mock backend; the same signature is what a real `fetch` to a
 * Gridify-enabled API would use (the fetch branch is implemented and ready).
 */

export type HttpMethod = "GET" | "POST" | "PATCH";

export type QueryValue = string | number | boolean | null | undefined;
export type ApiQuery = Record<string, QueryValue>;

export interface ApiRequestOptions {
  query?: ApiQuery;
  body?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const USE_MOCK_BACKEND = true;
const BASE_URL = "/api";

function latencyMs(): number {
  // 180–420ms — enough to feel like a network round-trip without slowing demos.
  return Math.round(180 + Math.random() * 240);
}

function toSearch(query: ApiQuery | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

function cloneBody<T>(body: T): T {
  return typeof structuredClone === "function" ? structuredClone(body) : body;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiRequest<T>(
  method: HttpMethod,
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const search = toSearch(options.query);

  if (USE_MOCK_BACKEND) {
    await sleep(latencyMs());
    // Show the gridify round-trip — filter/orderBy strings go over the wire.
    console.debug(`[mock] ${method} ${path}${search}`);
    try {
      const body = handleMockRequest({
        method,
        path,
        params: {},
        query: Object.fromEntries(new URLSearchParams(search)),
        body: options.body,
      });
      return cloneBody(body) as T;
    } catch (error) {
      if (error instanceof MockHttpError) throw new ApiError(error.status, error.message);
      throw error;
    }
  }

  // Real backend branch — same contract, different transport.
  const response = await fetch(`${BASE_URL}${path}${search}`, {
    method,
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) throw new ApiError(response.status, await response.text());
  const data = (await response.json()) as T;
  return data;
}
