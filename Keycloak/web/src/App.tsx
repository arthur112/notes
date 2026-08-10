import { useEffect, useRef, useState } from "react";
import { API1_URL, keycloak } from "./keycloak";

async function callApi(path: string): Promise<unknown> {
  await keycloak.updateToken(30);
  const res = await fetch(`${API1_URL}${path}`, {
    headers: { Authorization: `Bearer ${keycloak.token}` },
  });
  return { status: res.status, body: await res.json() };
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    keycloak
      .init({ onLoad: "check-sso" })
      .then(() => setReady(true))
      .catch((err) => setResult({ initError: String(err) }));
  }, []);

  if (!ready) return <p>Contacting Keycloak…</p>;

  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 720, margin: "2rem auto" }}>
      <h1>Keycloak + Aspire POC</h1>

      {keycloak.authenticated ? (
        <>
          <p>
            Signed in as <strong>{keycloak.tokenParsed?.preferred_username}</strong>{" "}
            <button onClick={() => keycloak.logout()}>Log out</button>
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
        <button onClick={() => keycloak.login()}>Log in with Keycloak</button>
      )}

      {result !== null && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
