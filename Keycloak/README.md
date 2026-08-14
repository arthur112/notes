# Keycloak / ADFS + Aspire note

A minimalist POC of **OIDC/OAuth2** orchestrated by **.NET Aspire**, with a switchable identity provider: **Keycloak** (local container, default) or **ADFS** (external AD FS 2019+). It demonstrates two frontend patterns and the **three-layer authorization model** from the `Auth/` note:

- **SPA + PKCE** (`web` → `Api1`): React logs in with authorization code + PKCE via `oidc-client-ts` and calls Api1 with a bearer token. Api1 **forwards the user token** to Api2 (shared audience) and also calls Api2 **machine-to-machine** with client credentials.
- **BFF** (`web-bff` → `Bff`): the API is the OIDC confidential client; tokens never touch the browser. The SPA speaks cookie session + XSRF header only (Pattern A of the `Auth/` guide).

```
Browser (React, PKCE) ──login──► Keycloak :8080  (or ADFS)
      │ bearer (user token, aud: poc-api)
      ▼
   Api1 ──forward user token──► Api2 /api/user-data    (same user identity)
      │ client credentials (cached, scope: mail.send)
      └──────────────────────► Api2 /api/service-data · /api/mail/send

Browser (React, no tokens) ──cookie──► Bff ──OIDC code flow──► Keycloak
                                       └─client credentials──► Api2 /api/mail/send
```

## Layout

```
Keycloak/
├── AppHost/                  # Aspire AppHost: provider switch + Keycloak container + all apps
├── ServiceDefaults/          # standard Aspire service defaults
├── Api1/                     # PKCE-variant API (JWT bearer, audience poc-api)
│                             #   GET  /api/me · /api/call-api2-as-user · /api/call-api2-m2m
│                             #   GET  /api/expenses · POST /api/expenses/{id}/approve (Layer 3)
│                             #   POST /api/newsletters/send (Layer 2 policy → Api2, Layer 1 scope)
├── Bff/                      # BFF-variant API (cookie + OIDC, antiforgery, same business endpoints)
│                             #   GET  /api/auth/login · POST /api/auth/logout · GET /api/me
├── Api2/                     # resource server (same audience)
│                             #   GET  /api/user-data · /api/service-data (ServiceOnly)
│                             #   POST /api/mail/send (ServiceOnly + MailSend scope policy)
├── web/                      # Vite + React + oidc-client-ts (PKCE, port 5173)
├── web-bff/                  # Vite + React, cookie-only, no OIDC library (port 5174, proxies to Bff)
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

Then open the Aspire dashboard and click the **web** (PKCE variant) or **web-bff** (BFF variant) resource endpoint. Two users exist (password = username):

| User | Group / role | Department | Can send newsletter | Can approve expense |
|---|---|---|---|---|
| `test` | `mail-senders` → `MailSender` | Sales | yes (200) | #1 (Sales) only |
| `bob` | — | Engineering | no (403) | #2 (Engineering) only |

The buttons demonstrate:

1. **who am I** — identity + roles + department claims.
2. **Api1 → Api2 · forward my token** — Api2 returns the same user identity (`sub`, `preferred_username`).
3. **Api1 → Api2 · machine-to-machine** — Api1 gets a client-credentials token as `api1-service` (cached until ~30s before expiry).
4. **Send newsletter** — Layer 2 (user needs `MailSender` role) then Layer 1 (the app's service client carries the `mail.send` scope to Api2).
5. **Approve expense** — Layer 3 (resource-based: user's `department` claim must match the expense's department, unless `Admin`).

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
dotnet user-secrets set "Auth:Adfs:Bff:ClientId" "<bff-server-app-client-id>"
dotnet user-secrets set "Auth:Adfs:Bff:ClientSecret" "<bff-server-app-client-secret>"
dotnet run --project AppHost
```

In ADFS mode the Keycloak container is not started; the AppHost injects the ADFS authority into both APIs, the BFF, and the SPA instead.

### ADFS-side setup (application group)

One **application group** covers the whole POC:

- **Server application** with identifier `urn:poc:api` (or your URI) — this becomes the `aud` claim of access tokens, validated by both APIs (shared audience → token forwarding works).
- **Native application** client (public, PKCE — requires AD FS 2019+) with redirect URI `http://localhost:5173` — used by the SPA.
- **Server application** client for the BFF with redirect URI `http://localhost:5180/signin-oidc` — the OIDC confidential client of the BFF variant.
- **Web API** client with a client secret, permitted to request the server application's scope — used by Api1 (and the BFF, which reuses the same M2M client in ADFS mode) for client credentials.
- Claims issuance: ADFS emits `upn` (user name) and `appid` (calling client id) instead of Keycloak's `preferred_username`/`azp` — the AppHost maps these claim types per provider, and Api2's `ServiceOnly` policy checks `appid == <M2M client id>` in ADFS mode.
- **Issuance transform rules** (the ADFS half of the authorization mapping, see below): emit `role` claims from AD group membership (e.g. members of `APP-MAIL-SENDERS` → `role: MailSender`) and a `department` claim from the AD attribute, so the same policies work in both modes.

> The ADFS path is config-ready but **untested against a real server** (no ADFS instance was available when writing this note). Keycloak mode is the verified runnable path.

## The three-layer authorization model

Scopes are permissions of the **application**; roles are permissions of the **user**; business rules decide what the user may do **to a given object**. All three are wired here (the `Auth/` note explains the theory):

| Layer | Question | Keycloak mechanism | ADFS equivalent | Enforced in |
|---|---|---|---|---|
| 1. Scope | May this **app** send mail? | client scope `mail.send`, assigned only to `api1-service` + `bff-service` | scope on the Web API application + per-client application permission | ADFS/Keycloak at issuance (a client without the grant gets `invalid_scope` / "forbidden to access the resource with scope") + Api2's `MailSend` policy re-checks the `scope` claim |
| 2. Role | May this **user** send newsletters? | group `mail-senders` with realm role `MailSender`; `poc-roles` client scope maps realm roles → `role` claim | AD group + issuance transform rule → `role` claim | `CanSendMail` policy (`RequireRole`) on Api1/Bff |
| 3. Business rule | May this user approve **this** expense? | user attribute `department` → `department` claim | transform rule emitting `department` | `ExpenseApprovalHandler` (resource-based `IAuthorizationService` check) — code, not config |

Notes:

- `poc-spa` deliberately does **not** get the `mail.send` scope — a user token can never invoke Api2's mail endpoint directly, only the app's service client can (least privilege).
- The AppHost injects `Auth__RoleClaimType=role` in both modes, so `RequireRole("MailSender")` works unchanged against either provider.
- The BFF reuses the guide's CSRF double-submit pattern: mutating endpoints validate the antiforgery token (`X-XSRF-TOKEN` header), and unauthenticated API calls get `401`/`403` instead of redirects (cookie `OnRedirectToLogin`/`OnRedirectToAccessDenied` + an OIDC challenge guard that exempts only `/api/auth/login`).
- The BFF and Api1 duplicate the tiny expense store/handler on purpose: each variant is readable standalone.

## How it works

- **Provider switch**: `AppHost.cs` reads `Auth:Provider` (`keycloak` default, `adfs`). Either way it injects the same env vars into the APIs — `Auth__Authority`, `Auth__Audience`, `Auth__NameClaimType`, `Auth__ClientIdClaimType`, `M2M__TokenUrl`/`ClientId`/`ClientSecret` — so the API code is provider-agnostic: plain `AddJwtBearer` with authority/audience from config, and an M2M token service that posts `client_credentials` to the configured token URL.
- **Realm `poc`** (keycloak mode) is imported from `keycloak/realms/poc-realm.json` on container start: public client `poc-spa` (PKCE S256, `http://localhost:5173` redirects), confidential client `poc-bff` (auth code flow, `http://localhost:5180` redirects — the BFF's OIDC identity), confidential service clients `api1-service` and `bff-service` (service accounts, dev secrets), and a `poc-api-audience` client scope whose audience mapper puts `poc-api` in the `aud` claim of both user and service tokens. The custom `basic` scope carries the `oidc-sub-mapper` so tokens contain `sub` (in Keycloak 26 `sub` comes from the `basic` scope; `openid` is not a real client scope). Authorization data: realm roles `MailSender`/`Admin`, group `mail-senders` (grants `MailSender`; `test` is a member), the `poc-roles` client scope mapping realm roles → `role` and the `department` user attribute → `department` claim, and the `mail.send` client scope assigned only to the two service clients.
- **Shared audience** is what makes token forwarding valid: Api1 and Api2 both validate `aud: poc-api` (Keycloak) or the server-app identifier URI (ADFS), so a token issued for the SPA is accepted by both.
- **Api2 distinguishes callers by client id claim**: `azp`/`appid` = SPA client → user endpoint; = a known service client → service endpoints (`ServiceOnly` policy accepts `api1-service` and `bff-service` in Keycloak mode; the single M2M client id in ADFS mode).
- **One issuer for everyone** (keycloak mode): the browser and the APIs all reach Keycloak through the same host endpoint. `KC_HOSTNAME=https://localhost:8080` makes Keycloak advertise that issuer in its discovery document, so JWT validation is consistent everywhere. `RequireHttpsMetadata = false` keeps the door open to plain-HTTP ADFS test farms.
- `MapInboundClaims = false` keeps JWT claim names (`sub`, `azp`, `preferred_username`, `upn`, `appid`) instead of mapping them to SOAP-era `ClaimTypes`.
- The **dev client secret** lives in the realm JSON and is injected into Api1 via `M2M__ClientSecret` — POC convenience, not a production pattern (ADFS mode reads it from user secrets instead).
- **SPA**: `oidc-client-ts` handles the auth-code + PKCE redirect flow against either provider's discovery document (`web/src/auth.ts`); `web/src/App.tsx` runs the redirect callback when the URL contains `code`/`state` and otherwise restores the session. The Vite dev server is pinned to port 5173 (must match the SPA client's redirect URIs); Aspire injects `VITE_OIDC_AUTHORITY` / `VITE_OIDC_CLIENT_ID` / `services__api1__*` env vars, which `vite.config.ts` bakes in as `import.meta.env` constants.
- **web-bff** has no OIDC library at all: a tiny `api.ts` fetch wrapper sends the session cookie same-origin plus the `X-XSRF-TOKEN` header on mutations, and bounces to `/api/auth/login` on 401. Vite (port 5174) proxies `/api` and `/signin-oidc` to the BFF (port 5180) with `changeOrigin`, so the BFF computes its own registered redirect URI during the OIDC dance. The BFF redirects back to the SPA origin after login/logout. Logout is a plain form POST (full navigation) so the IdP's end-session redirect chain works. Note for curl testing: the session/correlation cookies are `Secure`, and curl — unlike browsers — refuses those over plain http even on localhost; use a browser for the manual demo.
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
- The PKCE SPA uses bearer tokens and needs no CSRF protection; the BFF variant uses cookies and has the full antiforgery setup (see above).
