var builder = DistributedApplication.CreateBuilder(args);

var sql = builder.AddSqlServer("sql").AddDatabase("app");

var migrations = builder
    .AddProject<Projects.Migrations>("migrations")
    .WithReference(sql)
    .WaitFor(sql);

// The identity provider: realm `federated` (clients, scopes, role, test users) is imported at
// container start. KC_HOSTNAME makes it advertise the issuer the browser and the api both use.
var keycloak = builder
    .AddKeycloak("keycloak", 8080)
    .WithRealmImport("../keycloak/realms")
    .WithEnvironment("KC_HOSTNAME", "https://localhost:8080");
const string authority = "https://localhost:8080/realms/federated";

// The api trusts Keycloak's tokens (metadata fetched on the first request, so no WaitFor) on top
// of the dotnet user-jwts ones from appsettings.Development.json. Scalar logs in as its own client.
var api = builder
    .AddProject<Projects.Api>("api")
    .WithReference(sql)
    .WithEnvironment("Authentication__Schemes__Bearer__Authority", authority)
    .WithEnvironment("Authentication__Schemes__Bearer__ValidAudiences__1", "federated-api")
    .WithEnvironment("Auth__OAuth__AuthorizationUrl", $"{authority}/protocol/openid-connect/auth")
    .WithEnvironment("Auth__OAuth__TokenUrl", $"{authority}/protocol/openid-connect/token")
    .WithEnvironment("Auth__OAuth__ClientId", "federated-scalar")
    .WithHttpHealthCheck("/health")
    .WithUrlForEndpoint("http", url => url.Url += "/scalar/v1")
    .WaitForCompletion(migrations);

// The shell, on a fixed port: it is the redirect URI registered in the realm. Vite proxies /api
// to the api (services__api__http__0), so the browser stays on one origin.
builder
    .AddViteApp("web", "../web")
    .WithBun()
    .WithEndpoint(
        "http",
        endpoint =>
        {
            endpoint.Port = 5173;
            endpoint.IsProxied = false;
        }
    )
    .WithEnvironment("VITE_OIDC_AUTHORITY", authority)
    .WithEnvironment("VITE_OIDC_CLIENT_ID", "federated-shell")
    .WithReference(api)
    .WaitFor(api)
    .WaitFor(keycloak)
    .WithExternalHttpEndpoints();

builder.Build().Run();
