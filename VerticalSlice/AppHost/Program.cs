var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres").AddDatabase("app");

var migrations = builder
    .AddProject<Projects.Migrations>("migrations")
    .WithReference(postgres)
    .WaitFor(postgres);

builder
    .AddProject<Projects.Api>("api")
    .WithReference(postgres)
    .WithHttpHealthCheck("/health")
    .WithUrlForEndpoint("http", url => url.Url += "/scalar/v1")
    .WaitForCompletion(migrations);

builder.Build().Run();
