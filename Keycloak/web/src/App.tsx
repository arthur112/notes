import { useEffect, useRef, useState } from "react";
import type { User } from "oidc-client-ts";
import { API1_URL, userManager } from "./auth";

async function callApi(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<unknown> {
  const user = await userManager.getUser();
  if (!user || user.expired) {
    await userManager.signinRedirect();
    return { redirected: "access token missing or expired, signing in again" };
  }
  const res = await fetch(`${API1_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${user.access_token}`,
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const params = new URLSearchParams(window.location.search);
    const isCallback = params.has("code") && params.has("state");
    (isCallback ? userManager.signinRedirectCallback() : userManager.getUser())
      .then((u) => {
        if (isCallback) window.history.replaceState(null, "", window.location.pathname);
        setUser(u ?? null);
        setReady(true);
      })
      .catch((err) => setResult({ initError: String(err) }));
  }, []);

  if (!ready) return <p>Contacting identity provider…</p>;

  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 720, margin: "2rem auto" }}>
      <h1>OIDC + Aspire POC · SPA (PKCE)</h1>

      {user && !user.expired ? (
        <>
          <p>
            Signed in as{" "}
            <strong>
              {(user.profile.preferred_username ?? user.profile.upn ?? user.profile.sub) as string}
            </strong>{" "}
            (roles: {((user.profile.role as string[] | string | undefined) ?? "—").toString()}){" "}
            <button onClick={() => userManager.signoutRedirect()}>Log out</button>
          </p>
          <p>
            <button onClick={async () => setResult(await callApi("/api/me"))}>
              Api1 · who am I
            </button>{" "}
            <button onClick={async () => setResult(await callApi("/api/call-api2-as-user"))}>
              Api1 → Api2 · forward my token
            </button>{" "}
            <button onClick={async () => setResult(await callApi("/api/call-api2-m2m"))}>
              Api1 → Api2 · machine-to-machine
            </button>
          </p>
          <p>
            <button
              onClick={async () =>
                setResult(
                  await callApi("/api/newsletters/send", {
                    method: "POST",
                    body: { templateId: "news", recipients: ["all@poc.local"] },
                  })
                )
              }
            >
              Send newsletter (needs MailSender role)
            </button>{" "}
            <button onClick={async () => setResult(await callApi("/api/expenses"))}>
              List expenses
            </button>{" "}
            <button
              onClick={async () =>
                setResult(await callApi("/api/expenses/1/approve", { method: "POST" }))
              }
            >
              Approve expense #1 (Sales)
            </button>{" "}
            <button
              onClick={async () =>
                setResult(await callApi("/api/expenses/2/approve", { method: "POST" }))
              }
            >
              Approve expense #2 (Engineering)
            </button>
          </p>
        </>
      ) : (
        <button onClick={() => userManager.signinRedirect()}>Log in</button>
      )}

      {result !== null && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
