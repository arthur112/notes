// The SPA never handles tokens: same-origin cookie + XSRF header on mutations.
export async function api<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<{ status: number; body: T | null }> {
  const xsrf = document.cookie
    .split("; ")
    .find((c) => c.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];

  const method = options.method ?? "GET";
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(method !== "GET" && xsrf
        ? { "X-XSRF-TOKEN": decodeURIComponent(xsrf) }
        : {}),
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 401 && url !== "/api/me") {
    window.location.href = "/api/auth/login"; // full navigation → OIDC challenge
    throw new Error("redirecting to login");
  }

  const text = await res.text();
  let body: T | null = null;
  try {
    body = text ? (JSON.parse(text) as T) : null;
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

export interface Me {
  name?: string;
  roles?: string[];
  department?: string;
}
