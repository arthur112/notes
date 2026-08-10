# Keycloak + Aspire note

A minimalist POC of **OIDC/OAuth2 with Keycloak** orchestrated by **.NET Aspire**: a React SPA logs in via Keycloak (authorization code + PKCE), calls Api1 with a bearer token, Api1 **forwards the user token** to Api2 (shared audience → the user is "connected everywhere"), and Api1 also calls Api2 **machine-to-machine** with client credentials.

```
Browser (React, PKCE) ──login──► Keycloak :8080
      │ bearer (user token, aud: poc-api)
      ▼
   Api1 ──forward user token──► Api2 /api/user-data    (same user identity)
      │ client credentials (cached)
      └──────────────────────► Api2 /api/service-data  (azp: api1-service)
```

## Layout

```
Keycloak/
├── AppHost/                  # Aspire AppHost: Keycloak container + Api1 + Api2 + Vite
├── ServiceDefaults/          # standard Aspire service defaults
├── Api1/                     # minimal API (JWT bearer, audience poc-api)
│                             #   GET /api/me · GET /api/call-api2-as-user · GET /api/call-api2-m2m
├── Api2/                     # minimal API (same audience)
│                             #   GET /api/user-data · GET /api/service-data (ServiceOnly policy: azp = api1-service)
├── web/                      # Vite + React + keycloak-js
├── keycloak/realms/          # poc realm, imported at container start
└── README.md
```

## Run it

Requires: .NET 10 SDK, Node 20+, Docker (for the Keycloak container), and docker **buildx** (Aspire builds a container-network tunnel image; on Arch: `pacman -S docker-buildx`, or drop the binary into `~/.docker/cli-plugins/`).

Aspire exposes Keycloak as **https://localhost:8080**, TLS-terminated with the ASP.NET dev certificate. On Linux, make it trusted once:

```bash
dotnet dev-certs https --trust
export SSL_CERT_DIR="$HOME/.aspnet/dev-certs/trust:/etc/ssl/certs"  # needed by curl/.NET/Node on Linux
```

```bash
cd Keycloak
dotnet run --project AppHost
```

Then open the Aspire dashboard, click the **web** resource endpoint, and **Log in with Keycloak** (`test` / `test`). The three buttons demonstrate:

1. **Api1 · who am I** — SPA → Api1 with the user token.
2. **Api1 → Api2 · forward my token** — Api1 forwards the same access token; Api2 returns the same user identity (`sub`, `preferred_username`).
3. **Api1 → Api2 · machine-to-machine** — Api1 gets a client-credentials token as `api1-service` (cached until ~30s before expiry) and calls Api2's service-only endpoint.

Keycloak admin console: https://localhost:8080 (user `admin`, generated password visible in the dashboard's `keycloak` resource parameters).

## How it works

- **Realm `poc`** is imported from `keycloak/realms/poc-realm.json` on container start: public client `poc-spa` (PKCE S256, `http://localhost:5173` redirects), confidential client `api1-service` (service account, dev secret), and a `poc-api-audience` client scope whose audience mapper puts `poc-api` in the `aud` claim of both user and service tokens. The custom `basic` scope carries the `oidc-sub-mapper` so tokens contain `sub` (in Keycloak 26 `sub` comes from the `basic` scope; `openid` is not a real client scope).
- **Shared audience** is what makes token forwarding valid: Api1 and Api2 both validate `aud: poc-api`, so a token issued for the SPA is accepted by both.
- **Api2 distinguishes callers by `azp`**: `poc-spa` → user endpoint, `api1-service` → service endpoint (`ServiceOnly` policy).
- **One issuer for everyone**: the browser and the APIs (via Aspire's service discovery) all reach Keycloak through the same host endpoint. `KC_HOSTNAME=https://localhost:8080` makes Keycloak advertise that issuer in its discovery document, so JWT validation is consistent everywhere. `RequireHttpsMetadata = false` is set because Aspire service discovery uses the `https+http://` scheme.
- `MapInboundClaims = false` keeps JWT claim names (`sub`, `azp`, `preferred_username`) instead of mapping them to SOAP-era `ClaimTypes`.
- The **dev client secret** lives in the realm JSON and is injected into Api1 via `M2M__ClientSecret` — POC convenience, not a production pattern.
- `poc-spa` also has `directAccessGrantsEnabled` (resource-owner password grant) purely so the flows can be smoke-tested with curl:
  ```bash
  curl -X POST https://localhost:8080/realms/poc/protocol/openid-connect/token \
    -d grant_type=password -d client_id=poc-spa -d username=test -d password=test -d scope=openid
  ```
- The Vite dev server is pinned to port 5173 (must match the SPA client's redirect URIs); Aspire injects `services__api1__*` / `services__keycloak__*` env vars, which `vite.config.ts` bakes in as `VITE_*`.

`Directory.Build.props` sets `AllowMissingPrunePackageData` to work around NETSDK1226 on SDK installs without the ASP.NET Core targeting pack's prune data.

## Notes / limitations

- The Keycloak Aspire integration packages are currently **preview** (`13.4.6-preview.*`).
- `WithRealmImport` is dev-time only (container file injection); production should bake realms into an image or seed via the Admin API.
- No CSRF/antiforgery here: the SPA uses bearer tokens, not cookies (contrast with the BFF pattern in the `Auth/` note).
