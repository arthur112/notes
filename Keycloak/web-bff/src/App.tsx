import { useEffect, useState } from "react";
import { api, type Me } from "./api";

function getXsrf(): string {
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
  return raw ? decodeURIComponent(raw) : "";
}

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  useEffect(() => {
    api<Me>("/api/me")
      .then((r) => {
        if (r.status === 200) setMe(r.body);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  if (!ready) return <p>Checking session…</p>;

  const run = async (fn: () => Promise<{ status: number; body: unknown }>) => {
    const r = await fn();
    setResult(r);
    if (r.status === 200) {
      const m = await api<Me>("/api/me");
      if (m.status === 200) setMe(m.body);
    }
  };

  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 720, margin: "2rem auto" }}>
      <h1>OIDC + Aspire POC · BFF (cookie session)</h1>

      {me ? (
        <>
          <p>
            Signed in as <strong>{me.name}</strong> (department: {me.department ?? "—"},
            roles: {me.roles?.join(", ") || "—"})
          </p>
          <form method="post" action="/api/auth/logout">
            <input type="hidden" name="__RequestVerificationToken" value={getXsrf()} />
            <button type="submit">Log out</button>
          </form>
          <p>
            <button onClick={() => run(() => api("/api/me"))}>BFF · who am I</button>{" "}
            <button
              onClick={() =>
                run(() =>
                  api("/api/newsletters/send", {
                    method: "POST",
                    body: JSON.stringify({ templateId: "news", recipients: ["all@poc.local"] }),
                  })
                )
              }
            >
              Send newsletter (needs MailSender role)
            </button>{" "}
            <button onClick={() => run(() => api("/api/expenses"))}>List expenses</button>{" "}
            <button onClick={() => run(() => api("/api/expenses/1/approve", { method: "POST" }))}>
              Approve expense #1 (Sales)
            </button>{" "}
            <button onClick={() => run(() => api("/api/expenses/2/approve", { method: "POST" }))}>
              Approve expense #2 (Engineering)
            </button>
          </p>
        </>
      ) : (
        <button onClick={() => (window.location.href = "/api/auth/login")}>Log in</button>
      )}

      {result !== null && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
