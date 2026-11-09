# OIDC

The shell signs in against Keycloak with the authorization code flow and PKCE. The API is an OAuth resource server: it checks the access token on every request (signature, issuer, audience, expiry, then the route's scope and role) and never sees a login. Locally, the API also accepts `dotnet user-jwts` tokens, so it can be called without Keycloak.

```text
browser (shell, oidc-client-ts)            Keycloak :8080 (realm federated)          Vite proxy → API (JwtBearer)
  │ no session → signinRedirect ────────────► login page (editor / viewer)
  │ ◄──────────── /?code=…&state=<url asked for>
  │ signinRedirectCallback: code + PKCE verifier → tokens (sessionStorage), URL restored, shell renders
  │ GET /api/orders  Authorization: Bearer <access token> ──────────────────────────► iss, aud, exp, signature
  │                                                                                   RequireScope("orders.read") → 200 / 401 / 403
```

Why a public client in the browser and not a BFF:

- The API stays a pure resource server. Moving between identity providers (Keycloak, ADFS, Entra ID) is configuration only (`Authentication:Schemes:Bearer`).
- The Vite proxy forwards the `Authorization` header unchanged, so the front's one-origin `/api` setup stays as it is.
- Switch to a BFF (a cookie session, with tokens kept on a server) if tokens must never reach the browser. That changes `http.ts` (cookies instead of a header) and adds a server, but the API stays the same.

## Scope = what the app may do, role = what the user may do

| Route | Scope (the client app) | Role (the user) |
| --- | --- | --- |
| `GET /api/customers`, `GET /api/customers/options` | `customers.read` | |
| `GET /api/orders`, `GET /api/orders/{orderNo}`, `GET /api/orders/{orderNo}/overview`, `GET /api/orders/reference-taken` | `orders.read` | |
| `POST /api/orders`, `PUT /api/orders/{orderNo}` | `orders.write` | `order-editor` |

Every requirement must pass. No valid token gets a `401`, and a valid token missing any requirement gets a `403`. Both are problem+json, like every other error.

- The shell's client is granted all three scopes, so every signed-in user gets them. Who may save is then decided by the **role**: `editor` holds `order-editor`, `viewer` doesn't.
- A token with `order-editor` but without `orders.write` (for example, from a reporting app granted only the read scopes) still can't save. The user may, but not through that app.
- Rules about specific records ("only orders of my customers") belong in the handler or the write path, using the user's claims. They aren't more scopes or roles.

## Front (`web/src/`)

| Piece | Where | What |
| --- | --- | --- |
| `userManager()` | `shell/auth.ts` | oidc-client-ts. `authority` / `client_id` from `VITE_OIDC_AUTHORITY` / `VITE_OIDC_CLIENT_ID` (set by the AppHost, with the same defaults in `web/.env`). Requests `openid profile email customers.read orders.read orders.write`, and renews the tokens automatically. Created on first use, so importing the API client in tests has no side effect. |
| Gate | `main.tsx` → `signIn()` | Runs **before the app module loads**. Back from the login page (`?code&state`), it finishes the code exchange and puts the URL the user asked for back in the address bar, before the router reads it. Otherwise it reuses the stored session or leaves for the login page. No app ever renders signed out. |
| Signed-in user | `shell/shell-provider.tsx` | `useShell().user` holds name, email and initials from the ID token's profile, `scopes` from the token response, and `roles` from the `role` claim. The sidebar shows the user and a **Sign out** button (`signoutRedirect`). |
| Permissions | `useShell().can({ scopes, roles })` | True when the user holds every listed scope and role. The orders domain declares what saving needs, mirroring the route (`domains/orders/access.ts`): `ORDER_WRITE = { scopes: ["orders.write"], roles: ["order-editor"] }`. |
| Hide / disable | `apps/app1/orders/pages.tsx`, `domains/orders/order-form/order-form.tsx` | Without `ORDER_WRITE`, App 1 hides **New order**, and the order form becomes read-only: a note, every control in a disabled `<fieldset>` (Save included), and the Cancel button renamed **Back**. |
| Token on requests | `api/http.ts` (`apiFetch`) | Adds `Authorization: Bearer <access token>` to every call. `getJson`, `sendJson` and `getPage` all use it, so both domains are covered. |
| `401` | `apiFetch` | The session is gone (expired and not renewable, revoked, signed out elsewhere): back to the login page, which returns to the same URL. |
| `403` | `getJson` / `sendJson` | Like any other problem: the route's error component on a read, a form-level message on a save. With the UI gating, a user only sees it by typing a URL, or if their roles changed during the session. |

Hiding and disabling are a convenience only. The API checks every request on its own.

## Back (`src/Api/`)

`Program.cs`:

```csharp
builder.Services.AddAuthentication().AddJwtBearer(options =>
{
    options.MapInboundClaims = false;  // keep claim names as issued (scope, role, sub)
    options.TokenValidationParameters.RoleClaimType = builder.Configuration["Auth:RoleClaimType"] ?? "role";
});
builder.Services.AddAuthorization();
…
app.UseExceptionHandler();
app.UseStatusCodePages();   // problem+json bodies for bodiless 401 / 403
app.UseHttpLogging();
app.UseAuthentication();    // explicit: WebApplication would otherwise add both first,
app.UseAuthorization();     // ahead of UseStatusCodePages, and 401/403 would have no body
```

- **Configuration only.** `Authority`, `ValidAudiences`, `ValidIssuer` and `SigningKeys` come from `Authentication:Schemes:Bearer`. `appsettings.Development.json` trusts the `dotnet-user-jwts` issuer (audience `http://localhost:5246`). The AppHost adds Keycloak's `Authority` and the `federated-api` audience on top, so both kinds of token work side by side: JwtBearer adds the issuer and keys from the Keycloak metadata to the configured ones.
- **`Auth/Scopes.cs`** holds the scope names and `RequireScope`, a policy that accepts both token shapes: one `scope` claim per scope (`dotnet user-jwts`), or one space-delimited `scope` claim (Keycloak, ADFS) or `scp` claim (Entra ID).
- **`Auth/Roles.cs`** holds `order-editor`. Routes use the built-in `RequireAuthorization(policy => policy.RequireRole(Roles.OrderEditor))`, which reads the `role` claim. Set `Auth:RoleClaimType` for an IdP that names it differently (`roles` in Entra ID).
- **Endpoints.** Each slice's `*Endpoints.cs` declares its requirements, so handlers never see the caller:

  ```csharp
  group.MapGet("", ListOrders.Handle).RequireScope(Scopes.OrdersRead);
  group.MapPost("", CreateOrder.Handle)
      .RequireScope(Scopes.OrdersWrite)                                       // the app may write
      .RequireAuthorization(policy => policy.RequireRole(Roles.OrderEditor)); // this user may
  ```

- **Scalar** (`Auth/OpenApiAuth.cs`). The OpenAPI document declares a `Bearer` scheme, so the Auth panel takes a pasted token. When `Auth:OAuth:*` is set (the AppHost sets it), it also declares an `OAuth2` authorization-code scheme. Scalar's Authorize button then logs in as the public client `federated-scalar` with PKCE and requests every scope from `Scopes.All`.

### Tokens without Keycloak

The signing key is created per machine in the API's user secrets on the first `create`:

```bash
dotnet user-jwts create --project src/Api --scope customers.read --scope orders.read --scope orders.write --role order-editor --output token
dotnet user-jwts create --project src/Api --scope orders.read --output token     # read-only: POST → 403
```

Paste one into Scalar's **Auth → Bearer**, or send `-H "Authorization: Bearer $TOKEN"`. The shell always signs in through Keycloak.

## Aspire and Keycloak

`AppHost/Program.cs`:

```csharp
var keycloak = builder.AddKeycloak("keycloak", 8080)
    .WithRealmImport("../keycloak/realms")
    .WithEnvironment("KC_HOSTNAME", "https://localhost:8080");
const string authority = "https://localhost:8080/realms/federated";

builder.AddProject<Projects.Api>("api")
    .WithEnvironment("Authentication__Schemes__Bearer__Authority", authority)
    .WithEnvironment("Authentication__Schemes__Bearer__ValidAudiences__1", "federated-api")
    .WithEnvironment("Auth__OAuth__AuthorizationUrl", $"{authority}/protocol/openid-connect/auth")
    .WithEnvironment("Auth__OAuth__TokenUrl", $"{authority}/protocol/openid-connect/token")
    .WithEnvironment("Auth__OAuth__ClientId", "federated-scalar") /* … */;

builder.AddViteApp("web", "../web")
    .WithEndpoint("http", e => { e.Port = 5173; e.IsProxied = false; })  // the registered redirect URI
    .WithEnvironment("VITE_OIDC_AUTHORITY", authority)
    .WithEnvironment("VITE_OIDC_CLIENT_ID", "federated-shell") /* … */;
```

- **One issuer for everyone.** The browser and the API both reach Keycloak at `https://localhost:8080`. Aspire terminates TLS there with the ASP.NET dev certificate, and `KC_HOSTNAME` makes Keycloak advertise that URL as its issuer, so the tokens' `iss` matches what the API expects.
- **No `WaitFor(keycloak)` on the API.** JwtBearer fetches the metadata on the first authenticated request. The shell waits for Keycloak, since its first action is a redirect to it.
- **Vite** exposes `VITE_*` environment variables to the client as `import.meta.env.VITE_*`. Its port is fixed at 5173 (`strictPort`), because the realm only allows that redirect URI.

The realm (`keycloak/realms/federated-realm.json`), imported at container start:

| Item | Value |
| --- | --- |
| Clients | `federated-shell` (public, PKCE S256, redirect `http://localhost:5173/*`, web origin `http://localhost:5173`), and `federated-scalar` (public, PKCE, `http://localhost:5246/*`) |
| Client scopes | `customers.read`, `orders.read`, `orders.write`: optional scopes, in the token's `scope` claim when requested |
| Audience | `federated-api-audience`: puts `federated-api` in `aud` |
| Roles | Realm role `order-editor`. The `federated-roles` scope maps realm roles to a flat `role` claim in the access token, ID token and userinfo (Keycloak nests them under `realm_access.roles` by default). |
| Profile | `basic` (the `sub` claim, which Keycloak 26 only emits from this scope), `profile` (`preferred_username`, `name`), `email` |
| Users | `editor` / `editor` (holds `order-editor`), `viewer` / `viewer` (no role) |

The admin console is at `https://localhost:8080` (user `admin`; the generated password is in the dashboard's `keycloak` resource parameters).

## Tests

Integration tests don't use Keycloak. `TestTokens` mints HS256 tokens with a test signing key, which `ApiWebFactory` registers under `Authentication:Schemes:Bearer:SigningKeys`, so the real JwtBearer validation runs:

```csharp
CreateClient(Scopes.OrdersRead)                                  // a token with exactly these scopes
CreateClient([Scopes.OrdersRead, Scopes.OrdersWrite], [Roles.OrderEditor])
CreateEditorClient()                                             // every scope + order-editor: the shell's editor
```

`OrdersAuthorizationTests` covers:

- a `401` problem without a token;
- read scopes per area;
- the scope × role matrix on create (only both together → `201`);
- the space-delimited `scope` claim.

The Aspire smoke test reads the seed counts straight from SQL and checks `/health`, which needs no token.
