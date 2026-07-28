# ADFS Authentication & Authorization for .NET 8 SPA + API Applications

**Implementation guide: the BFF pattern (Pattern A) and the three-layer authorization model**

This guide covers two things:

1. **Pattern A — Backend for Frontend (BFF):** how to wire a React SPA + .NET 8 API pair to ADFS so that tokens never touch the browser.
2. **Scopes and authorization:** what scopes actually mean, why they are *not* your authorization layer, and how to set up real authorization in three layers.

Assumed landscape:

```
                    ┌──────────────┐
                    │     ADFS     │  ← single issuer of all tokens
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           │               │               │
      ┌────▼─────┐   ┌────▼─────┐   ┌────▼─────┐
      │ React +  │   │ React +  │   │ React +  │   ← client-facing apps
      │ .NET API │   │ .NET API │   │ .NET API │     (each = ONE logical app)
      └────┬─────┘   └────┬─────┘   └────┬─────┘
           │               │               │
           └───────┬───────┴───────┬───────┘
                   │               │
            ┌──────▼─────┐  ┌──────▼──────┐
            │  Mailing   │  │  Reporting  │   ← common services
            │  Service   │  │  Service    │     (APIs / resource servers)
            └────────────┘  └─────────────┘
```

---

## Part 1 — Pattern A: Backend for Frontend (BFF)

### 1.1 Why BFF with ADFS

A React app is a **public client**: anything shipped to the browser — including a client secret — is public by definition. So the SPA cannot hold secrets and cannot safely keep tokens. Two consequences:

- The standards-compliant way for a SPA to talk to ADFS directly is authorization code flow **with PKCE**, which ADFS only supports from **2019 onward**. On ADFS 2016 you'd fall back to the deprecated implicit flow — don't.
- Even on ADFS 2019+, tokens in the browser are exposed to XSS and create storage/refresh headaches.

The BFF pattern solves both: **the .NET API is the OIDC confidential client**. It handles the redirect dance with ADFS, keeps tokens server-side, and exposes a plain cookie session to the React app. From ADFS's perspective, **React + its .NET API = one single application** (one registration). The SPA is just its UI.

```
                 cookie (HttpOnly session)        client credentials
React SPA ───────────────────────────► .NET API ───────────────────────► Mailing Service
                      ▲                   │
                      └──── 302 redirect ─┤
                                          ▼
                              OIDC authorization code flow
                              against ADFS (secret server-side)
```

### 1.2 The flows at a glance

**Login flow**

1. Browser calls the API without a session (e.g. `GET /api/me`) → `401`.
2. API (or a dedicated `/api/auth/login` endpoint) challenges → 302 redirect to ADFS `/adfs/oauth2/authorize`.
3. User authenticates at ADFS (Windows Integrated Auth, MFA policy, etc.).
4. ADFS redirects back to the API's callback with an authorization **code**.
5. The API exchanges code + client secret at `/adfs/oauth2/token`, validates the ID token, creates the session cookie, redirects to the React app.
6. All subsequent React → API calls carry the cookie. No token ever reaches JS.

**Downstream call flow**

1. React calls `POST /api/newsletters/send` with the cookie.
2. The API authenticates the cookie, authorizes the *user* (see Part 2).
3. The API acquires (or reuses a cached) **client-credentials** token scoped to the mailing service.
4. The mailing service validates the JWT and authorizes the *calling app*.

### 1.3 BFF authentication setup (.NET API)

`Microsoft.AspNetCore.Authentication.OpenIdConnect` + cookies. The secret lives only on the server — that is the entire point of the pattern.

```csharp
// Program.cs of the client-facing .NET API (the BFF)
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    options.Cookie.Name = "__Host-appa";
    options.Cookie.HttpOnly = true;                       // not readable from JS
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Lax;           // Strict if fully same-site
    options.SlidingExpiration = true;
    options.ExpireTimeSpan = TimeSpan.FromHours(8);
    // APIs must return 401, not a 302 to ADFS, on AJAX calls:
    options.Events.OnRedirectToLogin = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
})
.AddOpenIdConnect(options =>
{
    options.Authority = "https://adfs.contoso.com/adfs";  // discovery: /adfs/.well-known/openid-configuration
    options.ClientId = "app-a";
    options.ClientSecret = builder.Configuration["Adfs:ClientSecret"]; // from a secrets store
    options.ResponseType = "code";
    options.SaveTokens = true;                            // tokens stay server-side in the auth session
    options.Scope.Clear();
    options.Scope.Add("openid");
    options.Scope.Add("profile");
    options.CallbackPath = "/signin-oidc";                // must match the redirect URI registered in ADFS
    options.TokenValidationParameters = new TokenValidationParameters
    {
        NameClaimType = "upn",
        RoleClaimType = "role"                            // match what your transform rules emit
    };
});

builder.Services.AddAuthorization();
var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();
// ... endpoints ...
app.Run();
```

### 1.4 Login, logout, and "who am I" endpoints

With the default challenge scheme set, any `[Authorize]` endpoint triggers the ADFS redirect automatically. Explicit endpoints make the SPA's life easier:

```csharp
// Minimal endpoints
app.MapGet("/api/auth/login", () =>
    Results.Challenge(new AuthenticationProperties { RedirectUri = "/" }))
   .AllowAnonymous();

app.MapPost("/api/auth/logout", async (HttpContext ctx) =>
{
    await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    await ctx.SignOutAsync(OpenIdConnectDefaults.AuthenticationScheme,
        new AuthenticationProperties { RedirectUri = "/" }); // also ends the ADFS session
})
.RequireAuthorization();

app.MapGet("/api/me", (ClaimsPrincipal user) => new
{
    name = user.Identity?.Name,
    roles = user.FindAll("role").Select(c => c.Value)
})
.RequireAuthorization();
```

### 1.5 CSRF protection

Bearer-token APIs are immune to CSRF; **cookie-based APIs are not**. Once the SPA authenticates via cookie, protect every mutating endpoint. The standard double-submit pattern with ASP.NET Core antiforgery:

```csharp
// Program.cs
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-XSRF-TOKEN";                  // header React will send back
    options.Cookie.Name = "XSRF-TOKEN";
    options.Cookie.HttpOnly = false;                      // JS must read this one (it's not the session)
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Strict;
});

// Issue the token cookie after login
app.Use(async (ctx, next) =>
{
    if (ctx.User.Identity?.IsAuthenticated == true)
    {
        var antiforgery = ctx.RequestServices.GetRequiredService<IAntiforgery>();
        var tokens = antiforgery.GetAndStoreTokens(ctx);
        ctx.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!,
            new CookieOptions { HttpOnly = false, Secure = true, SameSite = SameSiteMode.Strict });
    }
    await next();
});
```

```csharp
// Protecting a mutating endpoint
app.MapPost("/api/newsletters/send", async (HttpContext ctx, SendRequest req) =>
{
    var antiforgery = ctx.RequestServices.GetRequiredService<IAntiforgery>();
    await antiforgery.ValidateRequestAsync(ctx);          // throws 400 on missing/invalid token
    // ... business logic ...
})
.RequireAuthorization("CanSendMail");
```

### 1.6 The React side

The SPA never handles tokens. It calls same-origin endpoints with credentials, sends the antiforgery header on mutations, and bounces to login on 401.

```tsx
// api.ts — tiny fetch wrapper
export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const xsrf = document.cookie
    .split("; ").find(c => c.startsWith("XSRF-TOKEN="))?.split("=")[1];

  const res = await fetch(url, {
    credentials: "same-origin",              // send the session cookie
    headers: {
      "Content-Type": "application/json",
      ...(options.method && options.method !== "GET" && xsrf
        ? { "X-XSRF-TOKEN": decodeURIComponent(xsrf) }
        : {}),
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 401) {
    window.location.href = "/api/auth/login"; // full navigation → OIDC challenge
    throw new Error("redirecting to login");
  }
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}
```

```tsx
// usage
const me = await api<{ name: string; roles: string[] }>("/api/me");
await api("/api/newsletters/send", {
  method: "POST",
  body: JSON.stringify({ templateId: "news", recipients }),
});
```

> Serve the SPA and the API from the **same site** (same origin in dev via a proxy like Vite's `server.proxy`) so `SameSite=Lax` cookies flow without CORS. If you truly must go cross-origin, you'll need `SameSite=None; Secure` plus explicit CORS — and more CSRF surface to defend.

### 1.7 Calling common services: client credentials with caching

The API calls the mailing service **as itself**, not as the user. Cache the token until shortly before expiry — never hit ADFS per request.

```csharp
// TokenService.cs — acquire + cache client-credentials tokens
public class AdfsTokenService(HttpClient http, IMemoryCache cache, IConfiguration config)
{
    public async Task<string> GetTokenAsync(string audience, string scope, CancellationToken ct = default)
    {
        var cacheKey = $"adfs-token:{audience}:{scope}";
        if (cache.TryGetValue(cacheKey, out string? cached)) return cached!;

        var response = await http.PostAsync(
            "https://adfs.contoso.com/adfs/oauth2/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "client_credentials",
                ["client_id"] = config["Adfs:ServiceClientId"]!,
                ["client_secret"] = config["Adfs:ServiceClientSecret"]!,
                // ADFS 2019+: scope-based targeting. On ADFS 2016 use ["resource"] = audience instead.
                ["scope"] = scope
            }), ct);

        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken: ct);

        // refresh 5 minutes before actual expiry
        var lifetime = TimeSpan.FromSeconds(payload!.expires_in) - TimeSpan.FromMinutes(5);
        cache.Set(cacheKey, payload.access_token, lifetime);
        return payload.access_token;
    }

    private record TokenResponse(string access_token, int expires_in, string token_type);
}
```

```csharp
// Typed HttpClient with a delegating handler that attaches the token
public class MailingAuthHandler(AdfsTokenService tokens) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        var token = await tokens.GetTokenAsync(
            audience: "https://mailing.contoso.com",
            scope: "https://mailing.contoso.com/mail.send", ct);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await base.SendAsync(request, ct);
    }
}

// Program.cs
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<AdfsTokenService>();
builder.Services.AddTransient<MailingAuthHandler>();
builder.Services.AddHttpClient("mailing", c =>
        c.BaseAddress = new Uri("https://mailing.internal.contoso.com"))
    .AddHttpMessageHandler<MailingAuthHandler>();
```

```csharp
// Using it from an endpoint — note the hybrid user-context pattern:
// the call is app-authenticated; the *user* is passed as business context.
app.MapPost("/api/newsletters/send", async (HttpContext ctx, SendRequest req,
    IHttpClientFactory factory, IAntiforgery antiforgery) =>
{
    await antiforgery.ValidateRequestAsync(ctx);

    var mailing = factory.CreateClient("mailing");
    var response = await mailing.PostAsJsonAsync("/send", new
    {
        req.TemplateId,
        req.Recipients,
        RequestedBy = ctx.User.Identity?.Name   // audit trail: the service trusts the app's assertion
    });
    return response.IsSuccessStatusCode ? Results.Ok() : Results.Problem("Mailing service failed");
})
.RequireAuthorization("CanSendMail");          // user-level check — see Part 2
```

### 1.8 ADFS registration checklist

Per client-facing app, one **Application Group** containing:

| Item | What to register |
|---|---|
| Server application (the BFF) | Client ID `app-a`, secret, redirect URI `https://appa.contoso.com/signin-oidc` |
| Web API application (the app's own API) | Identifier = `https://appa.contoso.com/api` (only needed if other backends call it) |
| Server application (service client) | Client ID `app-a-service`, secret — used for client-credentials calls into common services |

For the common services (done once per service):

| Item | What to register |
|---|---|
| Web API application (e.g. mailing) | Identifier = `https://mailing.contoso.com`; scopes = `mail.send`, `mail.templates.read`, ... |
| Scope grants | Grant `mail.send` only to the service clients that need it (`app-a-service`, `app-b-service`) |

Also: token lifetime policy on the relying party, and **issuance transform rules** (see Layer 2 below).

---

## Part 2 — Scopes and the three-layer authorization model

### 2.1 What a scope actually is (and isn't)

> **A scope is a permission of the *application*, not of the *user*.**

When ADFS issues a token with `scope: mail.send`, the statement is:

> "The *client application* presenting this token is allowed to ask the mailing service to send mail."

It says **nothing** about which human triggered the request or whether that human should be allowed to. Scopes are a coarse, central, app-to-service control plane — think of them as network ACLs at the token level. Real authorization needs three layers, and none can substitute for another:

| Layer | Question answered | Enforced by | Configured in |
|---|---|---|---|
| **1. Scope** | May this **app** use this service capability? | ADFS at token issuance + API scope check | ADFS application groups |
| **2. Role / claims** | May this **user** use this feature? | .NET authorization policies | AD groups + ADFS transform rules |
| **3. Business rules** | May this user do it **to this data**? | Your code | Your domain logic |

### 2.2 Layer 1 — Client authorization with scopes

**ADFS side (2019+):** on the mailing service's *Web API application*, define the scopes it exposes (`mail.send`, `mail.templates.read`). On each client, grant only what it needs. ADFS enforces this at token issuance — a client granted nothing can't even obtain a token for the service.

**API side:** always verify the scope claim anyway (defense in depth — also covers tokens issued before a grant was revoked):

```csharp
// Mailing service — Program.cs
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://adfs.contoso.com/adfs";
        options.Audience = "https://mailing.contoso.com";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2)
        };
    });

builder.Services.AddAuthorization(options =>
{
    // caller must carry the mail.send scope
    options.AddPolicy("MailSend", policy =>
        policy.RequireAssertion(ctx =>
            ctx.User.FindFirst("scope")?.Value.Split(' ').Contains("mail.send") == true
            || ctx.User.FindFirst("scp")?.Value.Split(' ').Contains("mail.send") == true)); // claim name varies — check your tokens

    // optionally: only known apps may call at all
    options.AddPolicy("TrustedApps", policy =>
        policy.RequireClaim("client_id", "app-a-service", "app-b-service", "app-c-service"));
});

app.MapPost("/send", (SendMailRequest req) => { /* ... */ })
   .RequireAuthorization("TrustedApps", "MailSend");
```

> ADFS 2016 note: custom scopes are effectively absent; you steer with the `resource` parameter instead. The model still works — Layer 1 just becomes per-resource rather than per-scope.

### 2.3 Layer 2 — User authorization with roles and claims

The pipeline:

1. Users live in AD groups, e.g. `APP-A-MAIL-SENDERS`, `APP-A-ADMINS`.
2. **Issuance transform rules** on the relying party translate group membership into claims on the token.
3. The API enforces them as policies.

**ADFS issuance transform rule (claim rule language)** — emit a `role` claim for members of a group:

```
c:[Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/groupsid",
   Value == "S-1-5-21-XXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX-5121"]
 => issue(Type = "role", Value = "MailSender");
```

(or use the GUI template *"Send Group Membership as a Claim"* on the relying party trust.)

**API side:**

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("CanSendMail", policy => policy.RequireRole("MailSender"));
    options.AddPolicy("AdminOnly",  policy => policy.RequireRole("AppA.Admin"));
});

app.MapPost("/api/newsletters/send", handler).RequireAuthorization("CanSendMail");
app.MapGet("/api/admin/users",     handler).RequireAuthorization("AdminOnly");
```

For controller-based APIs: `[Authorize(Policy = "CanSendMail")]` on the action or controller.

### 2.4 Layer 3 — Resource and business authorization

Scopes and roles can't express *"a manager may only approve expenses of their own department"* or *"users see only orders they created."* That lives in your code — resource-based authorization:

```csharp
// The requirement + handler
public class ExpenseApprovalRequirement : IAuthorizationRequirement { }

public class ExpenseApprovalHandler
    : AuthorizationHandler<ExpenseApprovalRequirement, Expense>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ExpenseApprovalRequirement requirement,
        Expense expense)
    {
        var department = context.User.FindFirst("department")?.Value;
        if (department == expense.Department || context.User.IsInRole("AppA.Admin"))
            context.Succeed(requirement);
        return Task.CompletedTask;
    }
}

// Program.cs
builder.Services.AddSingleton<IAuthorizationHandler, ExpenseApprovalHandler>();
```

```csharp
// Usage in an endpoint
app.MapPost("/api/expenses/{id}/approve", async (int id, ClaimsPrincipal user,
    IAuthorizationService authz, IExpenseRepository repo) =>
{
    var expense = await repo.GetAsync(id);
    if (expense is null) return Results.NotFound();

    var result = await authz.AuthorizeAsync(user, expense, new ExpenseApprovalRequirement());
    return result.Succeeded ? Results.Ok(/* approve */) : Results.Forbid();
})
.RequireAuthorization();   // authenticated + Layer 2 at the route level; Layer 3 inside
```

Sometimes plain service-layer checks are clearer than the handler machinery — same idea, less ceremony. What matters is that the rule lives in your domain code, not in ADFS.

### 2.5 End-to-end walkthrough

User clicks **"Send newsletter"** in App A's React UI:

1. **React → App A API:** `POST /api/newsletters/send` with session cookie + `X-XSRF-TOKEN` header.
2. **BFF:** cookie middleware authenticates the user; antiforgery validation passes.
3. **Layer 2:** `RequireAuthorization("CanSendMail")` — user has the `MailSender` role (from AD group, via transform rule).
4. **Layer 3:** business check — may this user send *this* template to *this* recipient list? (in code).
5. **Layer 1:** App A acquires a cached client-credentials token carrying `scope: mail.send`.
6. **Mailing service:** validates JWT (issuer, audience, lifetime) → checks `scope` claim → checks caller identity (`client_id`) → sends, logging `RequestedBy` for the user-level audit trail.

### 2.6 Summary

- **Scopes** answer *"may this app use this capability?"* — configured in ADFS application groups, enforced at issuance and re-checked by the API.
- **Roles/claims** answer *"may this user use this feature?"* — AD groups → transform rules → .NET policies.
- **Business rules** answer *"may this user do this to this data?"* — your code, always.
- The **BFF** keeps tokens out of the browser: React speaks cookies, the API speaks OIDC to ADFS and client credentials to common services.

---

## Part 3 — Operational checklist

- **Cache client-credentials tokens** until ~5 minutes before expiry; otherwise ADFS becomes a bottleneck and a single point of failure.
- **Secrets** go in a secrets store (Azure Key Vault, or environment variables / user-secrets in dev) — never in `appsettings.json` under source control.
- **Validate JWTs locally** via the discovery-endpoint signing keys; don't forward tokens to ADFS for validation.
- **Clock skew:** set `ClockSkew` deliberately if you see intermittent expiry rejections across servers.
- **Cookie hardening:** `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict`), `__Host-` prefix, sliding expiration tuned to your risk appetite.
- **CSRF:** every mutating cookie-authenticated endpoint must validate the antiforgery token — no exceptions.
- **Least privilege in ADFS:** each service client gets only the scopes of the services it actually calls; revoke by removing the grant, not by deploying code.
- **ADFS version matters:** PKCE and first-class custom scopes require **2019+**; on 2016, use the `resource` parameter and keep the BFF pattern (no pure-SPA flows).
- **Keep common services off public ingress** (internal network/gateway only) — token validation is necessary but not sufficient defense in depth.
- **Audit:** propagate `RequestedBy` on service-to-service calls so logs tell you *which user*, not just *which app*, triggered an action.
