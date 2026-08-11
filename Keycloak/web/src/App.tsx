import { useEffect, useRef, useState } from "react";
import type { User } from "oidc-client-ts";
import { API1_URL, userManager } from "./auth";

async function callApi(path: string): Promise<unknown> {
  const user = await userManager.getUser();
  if (!user || user.expired) {
    await userManager.signinRedirect();
    return { redirected: "access token missing or expired, signing in again" };
  }
  const res = await fetch(`${API1_URL}${path}`, {
    headers: { Authorization: `Bearer ${user.access_token}` },
  });
  return { status: res.status, body: await res.json() };
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
      <h1>OIDC + Aspire POC</h1>

      {user && !user.expired ? (
        <>
          <p>
            Signed in as{" "}
            <strong>
              {(user.profile.preferred_username ?? user.profile.upn ?? user.profile.sub) as string}
            </strong>{" "}
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
        </>
      ) : (
        <button onClick={() => userManager.signinRedirect()}>Log in</button>
      )}

      {result !== null && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
