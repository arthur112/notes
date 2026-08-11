# Keycloak / ADFS + Aspire note

A minimalist POC of **OIDC/OAuth2** orchestrated by **.NET Aspire**, with a switchable identity provider: **Keycloak** (local container, default) or **ADFS** (external AD FS 2019+). A React SPA logs in with authorization code + PKCE (via `oidc-client-ts`, which speaks standard OIDC to either provider), calls Api1 with a bearer token, Api1 **forwards the user token** to Api2 (shared audience → the user is "connected everywhere"), and Api1 also calls Api2 **machine-to-machine** with client credentials.

```
Browser (React, PKCE) ──login──► Keycloak :8080  (or ADFS)
      │ bearer (user token, aud: poc-api)
      ▼
   Api1 ──forward user token──► Api2 /api/user-data    (same user identity)
      │ client credentials (cached)
      └──────────────────────► Api2 /api/service-data  (caller: api1-service)
```

## Layout

```
Keycloak/
├── AppHost/                  # Aspire AppHost: provider switch + Keycloak container + Api1 + Api2 + Vite
├── ServiceDefaults/          # standard Aspire service defaults
├── Api1/                     # minimal API (JWT bearer, audience poc-api)
│                             #   GET /api/me · GET /api/call-api2-as-user · GET /api/call-api2-m2m
├── Api2/                     # minimal API (same audience)
│                             #   GET /api/user-data · GET /api/service-data (ServiceOnly policy)
├── web/                      # Vite + React + oidc-client-ts
├── keycloak/realms/          # poc realm, imported at container start (keycloak mode only)
└── README.md
```

## Run it (Keycloak mode — default)

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

Then open the Aspire dashboard, click the **web** resource endpoint, and **Log in** (`test` / `test`). The three buttons demonstrate:

1. **Api1 · who am I** — SPA → Api1 with the user token.
2. **Api1 → Api2 · forward my token** — Api1 forwards the same access token; Api2 returns the same user identity (`sub`, `preferred_username`).
3. **Api1 → Api2 · machine-to-machine** — Api1 gets a client-credentials token as `api1-service` (cached until ~30s before expiry) and calls Api2's service-only endpoint.

Keycloak admin console: https://localhost:8080 (user `admin`, generated password visible in the dashboard's `keycloak` resource parameters).

## Run it against ADFS

Set the provider and connection details via **user secrets or environment variables** (nothing ADFS-specific is committed):

```bash
cd Keycloak/AppHost
dotnet user-secrets set "Auth:Provider" "adfs"
dotnet user-secrets set "Auth:Adfs:Authority" "https://adfs.example.com/adfs"
dotnet user-secrets set "Auth:Adfs:Audience" "urn:poc:api"
dotnet user-secrets set "Auth:Adfs:SpaClientId" "<native-app-client-id>"
dotnet user-secrets set "Auth:Adfs:M2m:ClientId" "<web-api-client-id>"
dotnet user-secrets set "Auth:Adfs:M2m:ClientSecret" "<web-api-client-secret>"
dotnet run --project AppHost
```

In ADFS mode the Keycloak container is not started; the AppHost injects the ADFS authority into both APIs and the SPA instead.

### ADFS-side setup (application group)

One **application group** covers the whole POC:

- **Server application** with identifier `urn:poc:api` (or your URI) — this becomes the `aud` claim of access tokens, validated by both APIs (shared audience → token forwarding works).
- **Native application** client (public, PKCE — requires AD FS 2019+) with redirect URI `http://localhost:5173` — used by the SPA.
- **Web API** client with a client secret, permitted to request the server application's scope — used by Api1 for client credentials.
- Claims issuance: ADFS emits `upn` (user name) and `appid` (calling client id) instead of Keycloak's `preferred_username`/`azp` — the AppHost maps these claim types per provider, and Api2's `ServiceOnly` policy checks `appid == <M2M client id>` in ADFS mode.

> The ADFS path is config-ready but **untested against a real server** (no ADFS instance was available when writing this note). Keycloak mode is the verified runnable path.

## How it works

- **Provider switch**: `AppHost.cs` reads `Auth:Provider` (`keycloak` default, `adfs`). Either way it injects the same env vars into the APIs — `Auth__Authority`, `Auth__Audience`, `Auth__NameClaimType`, `Auth__ClientIdClaimType`, `M2M__TokenUrl`/`ClientId`/`ClientSecret` — so the API code is provider-agnostic: plain `AddJwtBearer` with authority/audience from config, and an M2M token service that posts `client_credentials` to the configured token URL.
- **Realm `poc`** (keycloak mode) is imported from `keycloak/realms/poc-realm.json` on container start: public client `poc-spa` (PKCE S256, `http://localhost:5173` redirects), confidential client `api1-service` (service account, dev secret), and a `poc-api-audience` client scope whose audience mapper puts `poc-api` in the `aud` claim of both user and service tokens. The custom `basic` scope carries the `oidc-sub-mapper` so tokens contain `sub` (in Keycloak 26 `sub` comes from the `basic` scope; `openid` is not a real client scope).
- **Shared audience** is what makes token forwarding valid: Api1 and Api2 both validate `aud: poc-api` (Keycloak) or the server-app identifier URI (ADFS), so a token issued for the SPA is accepted by both.
- **Api2 distinguishes callers by client id claim**: `azp`/`appid` = SPA client → user endpoint; = `api1-service` → service endpoint (`ServiceOnly` policy, claim type and expected value from config).
- **One issuer for everyone** (keycloak mode): the browser and the APIs all reach Keycloak through the same host endpoint. `KC_HOSTNAME=https://localhost:8080` makes Keycloak advertise that issuer in its discovery document, so JWT validation is consistent everywhere. `RequireHttpsMetadata = false` keeps the door open to plain-HTTP ADFS test farms.
- `MapInboundClaims = false` keeps JWT claim names (`sub`, `azp`, `preferred_username`, `upn`, `appid`) instead of mapping them to SOAP-era `ClaimTypes`.
- The **dev client secret** lives in the realm JSON and is injected into Api1 via `M2M__ClientSecret` — POC convenience, not a production pattern (ADFS mode reads it from user secrets instead).
- **SPA**: `oidc-client-ts` handles the auth-code + PKCE redirect flow against either provider's discovery document (`web/src/auth.ts`); `web/src/App.tsx` runs the redirect callback when the URL contains `code`/`state` and otherwise restores the session. The Vite dev server is pinned to port 5173 (must match the SPA client's redirect URIs); Aspire injects `VITE_OIDC_AUTHORITY` / `VITE_OIDC_CLIENT_ID` / `services__api1__*` env vars, which `vite.config.ts` bakes in as `import.meta.env` constants.
- `poc-spa` also has `directAccessGrantsEnabled` (resource-owner password grant) purely so the flows can be smoke-tested with curl:
  ```bash
  curl -X POST https://localhost:8080/realms/poc/protocol/openid-connect/token \
    -d grant_type=password -d client_id=poc-spa -d username=test -d password=test -d scope=openid
  ```

`Directory.Build.props` sets `AllowMissingPrunePackageData` to work around NETSDK1226 on SDK installs without the ASP.NET Core targeting pack's prune data.

## Notes / limitations

- The Keycloak Aspire integration packages are currently **preview** (`13.4.6-preview.*`).
- `WithRealmImport` is dev-time only (container file injection); production should bake realms into an image or seed via the Admin API.
- ADFS mode requires AD FS 2019+ for SPA login (PKCE); AD FS 2016 supports client credentials but not PKCE, so the browser flow would need a different approach (e.g. a confidential BFF).
- ADFS mode does not start the Keycloak container, so the `keycloak/realms` import and admin console are absent.
- No CSRF/antiforgery here: the SPA uses bearer tokens, not cookies (contrast with the BFF pattern in the `Auth/` note).
