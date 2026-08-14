using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

var authority = builder.Configuration["Auth:Authority"] ?? "https://localhost:8080/realms/poc";
var nameClaimType = builder.Configuration["Auth:NameClaimType"] ?? "preferred_username";
var roleClaimType = builder.Configuration["Auth:RoleClaimType"] ?? "role";
var clientId = builder.Configuration["Bff:ClientId"] ?? "poc-bff";
var clientSecret = builder.Configuration["Bff:ClientSecret"] ?? "poc-bff-secret";
var spaOrigin = builder.Configuration["Bff:SpaOrigin"] ?? "http://localhost:5174";

// BFF: this API is the OIDC confidential client. Tokens stay server-side;
// the SPA only ever sees the session cookie (Pattern A of the Auth/ guide).
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    options.Cookie.Name = "__Host-bff";
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.SlidingExpiration = true;
    options.ExpireTimeSpan = TimeSpan.FromHours(8);
    options.Events.OnRedirectToLogin = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
})
.AddOpenIdConnect(options =>
{
    options.Authority = authority;
    options.ClientId = clientId;
    options.ClientSecret = clientSecret;
    options.ResponseType = "code";
    options.SaveTokens = true;
    options.RequireHttpsMetadata = false;
    options.MapInboundClaims = false;
    options.Scope.Clear();
    options.Scope.Add("openid");
    options.Scope.Add("profile");
    options.Scope.Add("email");
    options.CallbackPath = "/signin-oidc";
    // APIs must return 401 (not a 302 to the IdP) on AJAX calls; only the explicit
    // login endpoint may redirect.
    options.Events.OnRedirectToIdentityProvider = ctx =>
    {
        if (!ctx.Request.Path.StartsWithSegments("/api/auth/login"))
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            ctx.HandleResponse();
            return Task.CompletedTask;
        }
        return Task.CompletedTask;
    };
    options.TokenValidationParameters = new TokenValidationParameters
    {
        NameClaimType = nameClaimType,
        RoleClaimType = roleClaimType
    };
});

builder.Services.AddAuthorization(options =>
{
    // Layer 2 — the *user* must have the role (AD group → transform rule / Keycloak group → role mapper).
    options.AddPolicy("CanSendMail", policy => policy.RequireRole("MailSender"));
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

// Layer 3 — resource-based authorization lives in code, not in the identity provider.
builder.Services.AddSingleton<IAuthorizationHandler, ExpenseApprovalHandler>();
builder.Services.AddSingleton<ExpenseStore>();

// Cookie-authenticated APIs need CSRF protection on every mutation (double-submit pattern).
// The antiforgery cookie token keeps its default HttpOnly cookie; the middleware below
// republishes the *request* token in a separate JS-readable "XSRF-TOKEN" cookie.
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-XSRF-TOKEN";
});

builder.Services.AddHttpClient("api2", client => client.BaseAddress = new Uri("https+http://api2"));
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<M2mTokenService>();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

// Missing/invalid antiforgery tokens are a client error, not a server crash.
app.Use(async (ctx, next) =>
{
    try
    {
        await next();
    }
    catch (AntiforgeryValidationException)
    {
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
    }
});

// Issue the XSRF request-token cookie once the user is authenticated.
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

app.MapGet("/api/auth/login", () =>
    Results.Challenge(new AuthenticationProperties { RedirectUri = spaOrigin }))
   .AllowAnonymous();

app.MapPost("/api/auth/logout", async (HttpContext ctx, IAntiforgery antiforgery) =>
{
    await antiforgery.ValidateRequestAsync(ctx);
    await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    await ctx.SignOutAsync(OpenIdConnectDefaults.AuthenticationScheme,
        new AuthenticationProperties { RedirectUri = spaOrigin });
})
.RequireAuthorization();

app.MapGet("/api/me", (ClaimsPrincipal user) => new
{
    name = user.FindFirst(nameClaimType)?.Value,
    roles = user.FindAll(roleClaimType).Select(c => c.Value),
    department = user.FindFirst("department")?.Value
})
.RequireAuthorization();

app.MapGet("/api/expenses", (ExpenseStore store) => store.All())
    .RequireAuthorization();

app.MapPost("/api/expenses/{id}/approve", async (int id, HttpContext ctx,
    ClaimsPrincipal user, IAuthorizationService authz, ExpenseStore store, IAntiforgery antiforgery) =>
{
    await antiforgery.ValidateRequestAsync(ctx);

    var expense = store.Get(id);
    if (expense is null) return Results.NotFound();

    var result = await authz.AuthorizeAsync(user, expense, new ExpenseApprovalRequirement());
    if (!result.Succeeded) return Results.Forbid();

    expense.Approved = true;
    return Results.Ok(new { message = $"Expense {id} approved.", approvedBy = user.FindFirst(nameClaimType)?.Value });
})
.RequireAuthorization();

// Layer 2 at the route (user needs the MailSender role), Layer 1 on the downstream call
// (the bff-service client carries the mail.send scope).
app.MapPost("/api/newsletters/send", async (SendNewsletterRequest req, HttpContext ctx,
    ClaimsPrincipal user, M2mTokenService tokens, IHttpClientFactory httpFactory, IAntiforgery antiforgery) =>
{
    await antiforgery.ValidateRequestAsync(ctx);

    var token = await tokens.GetTokenAsync();
    var api2 = httpFactory.CreateClient("api2");

    using var request = new HttpRequestMessage(HttpMethod.Post, "/api/mail/send")
    {
        Content = JsonContent.Create(new
        {
            req.TemplateId,
            req.Recipients,
            RequestedBy = user.FindFirst(nameClaimType)?.Value
        })
    };
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

    var response = await api2.SendAsync(request);
    var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
    return Results.Json(new { api2Status = (int)response.StatusCode, api2Response = payload });
})
.RequireAuthorization("CanSendMail");

app.MapDefaultEndpoints();

app.Run();

public record SendNewsletterRequest(string TemplateId, string[] Recipients);

public class Expense
{
    public int Id { get; init; }
    public required string Department { get; init; }
    public decimal Amount { get; init; }
    public required string Description { get; init; }
    public bool Approved { get; set; }
}

public class ExpenseStore
{
    private readonly List<Expense> _expenses =
    [
        new() { Id = 1, Department = "Sales", Amount = 1200m, Description = "Conference tickets" },
        new() { Id = 2, Department = "Engineering", Amount = 800m, Description = "IDE licenses" }
    ];

    public IReadOnlyList<Expense> All() => _expenses;
    public Expense? Get(int id) => _expenses.FirstOrDefault(e => e.Id == id);
}

public class ExpenseApprovalRequirement : IAuthorizationRequirement { }

public class ExpenseApprovalHandler : AuthorizationHandler<ExpenseApprovalRequirement, Expense>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ExpenseApprovalRequirement requirement,
        Expense expense)
    {
        var department = context.User.FindFirst("department")?.Value;
        if (department == expense.Department || context.User.IsInRole("Admin"))
            context.Succeed(requirement);
        return Task.CompletedTask;
    }
}

public class M2mTokenService(IHttpClientFactory httpFactory, IMemoryCache cache, IConfiguration config)
{
    private const string CacheKey = "m2m-token";

    public async Task<string> GetTokenAsync(CancellationToken ct = default)
    {
        if (cache.TryGetValue(CacheKey, out string? cached)) return cached!;

        var form = new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["client_id"] = config["M2M:ClientId"] ?? "bff-service",
            ["client_secret"] = config["M2M:ClientSecret"]!
        };
        if (config["M2M:Scope"] is { } scope) form["scope"] = scope;

        var http = httpFactory.CreateClient();
        var response = await http.PostAsync(
            config["M2M:TokenUrl"] ?? "https://localhost:8080/realms/poc/protocol/openid-connect/token",
            new FormUrlEncodedContent(form), ct);

        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken: ct);

        var lifetime = TimeSpan.FromSeconds(payload!.ExpiresIn) - TimeSpan.FromSeconds(30);
        cache.Set(CacheKey, payload.AccessToken, lifetime);
        return payload.AccessToken;
    }

    private record TokenResponse(
        [property: JsonPropertyName("access_token")] string AccessToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn);
}
