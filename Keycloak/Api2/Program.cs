using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

var authority = builder.Configuration["Auth:Authority"] ?? "https://localhost:8080/realms/poc";
var audience = builder.Configuration["Auth:Audience"] ?? "poc-api";
var nameClaimType = builder.Configuration["Auth:NameClaimType"] ?? "preferred_username";
var clientIdClaimType = builder.Configuration["Auth:ClientIdClaimType"] ?? "azp";
var serviceClientIds = (builder.Configuration["Auth:ServiceClientIds"]
    ?? builder.Configuration["Auth:ServiceClientId"]
    ?? "api1-service")
    .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = authority;
        options.Audience = audience;
        options.RequireHttpsMetadata = false;
        options.MapInboundClaims = false;
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ServiceOnly", policy => policy.RequireAssertion(ctx =>
        serviceClientIds.Contains(ctx.User.FindFirst(clientIdClaimType)?.Value)));

    // Layer 1 — the *calling app* must carry the mail.send scope (Keycloak client scope /
    // ADFS application permission granted at issuance; re-checked here as defense in depth).
    options.AddPolicy("MailSend", policy => policy.RequireAssertion(ctx =>
    {
        var scope = ctx.User.FindFirst("scope")?.Value ?? ctx.User.FindFirst("scp")?.Value;
        return scope?.Split(' ', StringSplitOptions.RemoveEmptyEntries).Contains("mail.send") == true;
    }));
});

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/user-data", (ClaimsPrincipal user) => new
{
    message = "Api2 sees the same user identity as Api1 — the token was forwarded.",
    name = user.FindFirst(nameClaimType)?.Value,
    subject = user.FindFirst("sub")?.Value,
    client = user.FindFirst(clientIdClaimType)?.Value
})
.RequireAuthorization();

app.MapGet("/api/service-data", (ClaimsPrincipal user) => new
{
    message = "Machine-to-machine call: no user involved, caller is a service account.",
    client = user.FindFirst(clientIdClaimType)?.Value,
    subject = user.FindFirst("sub")?.Value
})
.RequireAuthorization("ServiceOnly");

app.MapPost("/api/mail/send", (SendMailRequest req, ClaimsPrincipal user) => new
{
    message = $"Mail sent via template '{req.TemplateId}' to {req.Recipients.Length} recipient(s).",
    sentByApp = user.FindFirst(clientIdClaimType)?.Value,
    requestedBy = req.RequestedBy
})
.RequireAuthorization("ServiceOnly", "MailSend");

app.MapDefaultEndpoints();

app.Run();

public record SendMailRequest(string TemplateId, string[] Recipients, string? RequestedBy);
