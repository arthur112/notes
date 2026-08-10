using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddKeycloakJwtBearer("keycloak", realm: "poc", options =>
    {
        options.Audience = "poc-api";
        options.RequireHttpsMetadata = false;
        options.MapInboundClaims = false;
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("ServiceOnly", policy => policy.RequireAssertion(ctx =>
        ctx.User.FindFirst("azp")?.Value == "api1-service"));
});

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/user-data", (ClaimsPrincipal user) => new
{
    message = "Api2 sees the same user identity as Api1 — the token was forwarded.",
    name = user.FindFirst("preferred_username")?.Value,
    subject = user.FindFirst("sub")?.Value,
    client = user.FindFirst("azp")?.Value
})
.RequireAuthorization();

app.MapGet("/api/service-data", (ClaimsPrincipal user) => new
{
    message = "Machine-to-machine call: no user involved, caller is a service account.",
    client = user.FindFirst("azp")?.Value,
    subject = user.FindFirst("sub")?.Value
})
.RequireAuthorization("ServiceOnly");

app.MapDefaultEndpoints();

app.Run();
