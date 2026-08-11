using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Caching.Memory;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

var authority = builder.Configuration["Auth:Authority"] ?? "https://localhost:8080/realms/poc";
var audience = builder.Configuration["Auth:Audience"] ?? "poc-api";
var nameClaimType = builder.Configuration["Auth:NameClaimType"] ?? "preferred_username";
var clientIdClaimType = builder.Configuration["Auth:ClientIdClaimType"] ?? "azp";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = authority;
        options.Audience = audience;
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.MapInboundClaims = false;
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(builder.Configuration["Cors:AllowedOrigin"] ?? "http://localhost:5173")
    .AllowAnyHeader()
    .AllowAnyMethod()));

builder.Services.AddHttpClient("api2", client => client.BaseAddress = new Uri("https+http://api2"));
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<M2mTokenService>();

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/me", (ClaimsPrincipal user) => new
{
    name = user.FindFirst(nameClaimType)?.Value,
    subject = user.FindFirst("sub")?.Value,
    client = user.FindFirst(clientIdClaimType)?.Value,
    scopes = user.FindFirst("scope")?.Value
})
.RequireAuthorization();

app.MapGet("/api/call-api2-as-user", async (HttpContext ctx, IHttpClientFactory httpFactory) =>
{
    var token = await ctx.GetTokenAsync("access_token");
    var api2 = httpFactory.CreateClient("api2");

    using var request = new HttpRequestMessage(HttpMethod.Get, "/api/user-data");
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

    var response = await api2.SendAsync(request);
    var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
    return Results.Json(new { api2Status = (int)response.StatusCode, api2Response = payload });
})
.RequireAuthorization();

app.MapGet("/api/call-api2-m2m", async (M2mTokenService tokens, IHttpClientFactory httpFactory) =>
{
    var token = await tokens.GetTokenAsync();
    var api2 = httpFactory.CreateClient("api2");

    using var request = new HttpRequestMessage(HttpMethod.Get, "/api/service-data");
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

    var response = await api2.SendAsync(request);
    var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
    return Results.Json(new { api2Status = (int)response.StatusCode, api2Response = payload });
})
.AllowAnonymous();

app.MapDefaultEndpoints();

app.Run();

public class M2mTokenService(IHttpClientFactory httpFactory, IMemoryCache cache, IConfiguration config)
{
    private const string CacheKey = "m2m-token";

    public async Task<string> GetTokenAsync(CancellationToken ct = default)
    {
        if (cache.TryGetValue(CacheKey, out string? cached)) return cached!;

        var form = new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["client_id"] = config["M2M:ClientId"] ?? "api1-service",
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
