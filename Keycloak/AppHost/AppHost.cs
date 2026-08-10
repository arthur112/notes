var builder = DistributedApplication.CreateBuilder(args);

var keycloak = builder.AddKeycloak("keycloak", 8080)
    .WithRealmImport("../keycloak/realms")
    .WithEnvironment("KC_HOSTNAME", "https://localhost:8080")
    .WithOtlpExporter();

var api2 = builder.AddProject<Projects.Api2>("api2")
    .WithReference(keycloak)
    .WaitFor(keycloak);

var api1 = builder.AddProject<Projects.Api1>("api1")
    .WithReference(keycloak)
    .WithReference(api2)
    .WithEnvironment("M2M__ClientSecret", "api1-service-secret")
    .WaitFor(keycloak)
    .WaitFor(api2);

var web = builder.AddViteApp("web", "../web")
    .WithNpm(install: true)
    .WithEndpoint("http", endpoint =>
    {
        endpoint.Port = 5173;
        endpoint.IsProxied = false;
    })
    .WithReference(api1)
    .WithReference(keycloak)
    .WithExternalHttpEndpoints()
    .WaitFor(api1);

api1.WithEnvironment("Cors__AllowedOrigin", web.GetEndpoint("http"));

builder.Build().Run();
