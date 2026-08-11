using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

var authority = builder.Configuration["Auth:Authority"] ?? "https://localhost:8080/realms/poc";
var audience = builder.Configuration["Auth:Audience"] ?? "poc-api";
var nameClaimType = builder.Configuration["Auth:NameClaimType"] ?? "preferred_username";
var clientIdClaimType = builder.Configuration["Auth:ClientIdClaimType"] ?? "azp";
var serviceClientId = builder.Configuration["Auth:ServiceClientId"] ?? "api1-service";

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
        ctx.User.FindFirst(clientIdClaimType)?.Value == serviceClientId));
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

app.MapDefaultEndpoints();

app.Run();
