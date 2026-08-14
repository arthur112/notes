var builder = DistributedApplication.CreateBuilder(args);

var useAdfs = string.Equals(builder.Configuration["Auth:Provider"], "adfs", StringComparison.OrdinalIgnoreCase);

IResourceBuilder<KeycloakResource>? keycloak = null;
if (!useAdfs)
{
    keycloak = builder.AddKeycloak("keycloak", 8080)
        .WithRealmImport("../keycloak/realms")
        .WithEnvironment("KC_HOSTNAME", "https://localhost:8080")
        .WithOtlpExporter();
}

string? adfsAuthority = null;
if (useAdfs)
{
    adfsAuthority = builder.Configuration["Auth:Adfs:Authority"]
        ?? throw new InvalidOperationException(
            "Auth:Provider=adfs requires Auth:Adfs:Authority (e.g. https://adfs.example.com/adfs) in user secrets or env vars.");
}

var authority = useAdfs
    ? ReferenceExpression.Create($"{adfsAuthority}")
    : ReferenceExpression.Create($"{keycloak!.GetEndpoint("http")}/realms/poc");
var m2mTokenUrl = useAdfs
    ? ReferenceExpression.Create($"{adfsAuthority}/oauth2/token")
    : ReferenceExpression.Create($"{keycloak!.GetEndpoint("http")}/realms/poc/protocol/openid-connect/token");

var audience = useAdfs
    ? builder.Configuration["Auth:Adfs:Audience"]
        ?? throw new InvalidOperationException("Auth:Provider=adfs requires Auth:Adfs:Audience (the server application's identifier URI).")
    : "poc-api";
var nameClaimType = useAdfs ? "upn" : "preferred_username";
var clientIdClaimType = useAdfs ? "appid" : "azp";
// ADFS: issuance transform rules emit "role" from AD groups; Keycloak: the poc-roles
// client scope maps realm roles into the same claim type, so API code is provider-agnostic.
var roleClaimType = "role";
var m2mClientId = useAdfs
    ? builder.Configuration["Auth:Adfs:M2m:ClientId"]
        ?? throw new InvalidOperationException("Auth:Provider=adfs requires Auth:Adfs:M2m:ClientId.")
    : "api1-service";
var m2mClientSecret = useAdfs
    ? builder.Configuration["Auth:Adfs:M2m:ClientSecret"]
        ?? throw new InvalidOperationException("Auth:Provider=adfs requires Auth:Adfs:M2m:ClientSecret.")
    : "api1-service-secret";
var spaClientId = useAdfs
    ? builder.Configuration["Auth:Adfs:SpaClientId"]
        ?? throw new InvalidOperationException("Auth:Provider=adfs requires Auth:Adfs:SpaClientId.")
    : "poc-spa";
var bffClientId = useAdfs
    ? builder.Configuration["Auth:Adfs:Bff:ClientId"]
        ?? throw new InvalidOperationException("Auth:Provider=adfs requires Auth:Adfs:Bff:ClientId (the BFF server application's client id).")
    : "poc-bff";
var bffClientSecret = useAdfs
    ? builder.Configuration["Auth:Adfs:Bff:ClientSecret"]
        ?? throw new InvalidOperationException("Auth:Provider=adfs requires Auth:Adfs:Bff:ClientSecret.")
    : "poc-bff-secret";
// Keycloak mode gives the BFF its own service identity; ADFS mode reuses the M2M client
// (register a second Web API client there if you want the same distinction).
var bffM2mClientId = useAdfs ? m2mClientId : "bff-service";
var bffM2mClientSecret = useAdfs ? m2mClientSecret : "bff-service-secret";
var serviceClientIds = useAdfs ? m2mClientId : $"{m2mClientId};{bffM2mClientId}";

var api2 = builder.AddProject<Projects.Api2>("api2")
    .WithEnvironment("Auth__Authority", authority)
    .WithEnvironment("Auth__Audience", audience)
    .WithEnvironment("Auth__ClientIdClaimType", clientIdClaimType)
    .WithEnvironment("Auth__ServiceClientIds", serviceClientIds);

var api1 = builder.AddProject<Projects.Api1>("api1")
    .WithEnvironment("Auth__Authority", authority)
    .WithEnvironment("Auth__Audience", audience)
    .WithEnvironment("Auth__NameClaimType", nameClaimType)
    .WithEnvironment("Auth__ClientIdClaimType", clientIdClaimType)
    .WithEnvironment("Auth__RoleClaimType", roleClaimType)
    .WithEnvironment("M2M__TokenUrl", m2mTokenUrl)
    .WithEnvironment("M2M__ClientId", m2mClientId)
    .WithEnvironment("M2M__ClientSecret", m2mClientSecret)
    .WithReference(api2)
    .WaitFor(api2);

var web = builder.AddViteApp("web", "../web")
    .WithNpm(install: true)
    .WithEndpoint("http", endpoint =>
    {
        endpoint.Port = 5173;
        endpoint.IsProxied = false;
    })
    .WithReference(api1)
    .WithEnvironment("VITE_OIDC_AUTHORITY", authority)
    .WithEnvironment("VITE_OIDC_CLIENT_ID", spaClientId)
    .WithExternalHttpEndpoints()
    .WaitFor(api1);

var bff = builder.AddProject<Projects.Bff>("bff")
    .WithEndpoint("http", endpoint =>
    {
        endpoint.Port = 5180;
        endpoint.IsProxied = false;
    })
    .WithEnvironment("Auth__Authority", authority)
    .WithEnvironment("Auth__NameClaimType", nameClaimType)
    .WithEnvironment("Auth__RoleClaimType", roleClaimType)
    .WithEnvironment("Bff__ClientId", bffClientId)
    .WithEnvironment("Bff__ClientSecret", bffClientSecret)
    .WithEnvironment("M2M__TokenUrl", m2mTokenUrl)
    .WithEnvironment("M2M__ClientId", bffM2mClientId)
    .WithEnvironment("M2M__ClientSecret", bffM2mClientSecret)
    .WithReference(api2)
    .WaitFor(api2);

var webBff = builder.AddViteApp("web-bff", "../web-bff")
    .WithNpm(install: true)
    .WithEndpoint("http", endpoint =>
    {
        endpoint.Port = 5174;
        endpoint.IsProxied = false;
    })
    .WithReference(bff)
    .WithExternalHttpEndpoints()
    .WaitFor(bff);

bff.WithEnvironment("Bff__SpaOrigin", webBff.GetEndpoint("http"));

if (keycloak is not null)
{
    api2.WithReference(keycloak).WaitFor(keycloak);
    api1.WithReference(keycloak).WaitFor(keycloak);
    bff.WithReference(keycloak).WaitFor(keycloak);
}

api1.WithEnvironment("Cors__AllowedOrigin", web.GetEndpoint("http"));

builder.Build().Run();
