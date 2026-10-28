var builder = DistributedApplication.CreateBuilder(args);

var sql = builder.AddSqlServer("sql").AddDatabase("app");

var migrations = builder
    .AddProject<Projects.Migrations>("migrations")
    .WithReference(sql)
    .WaitFor(sql);

builder
    .AddProject<Projects.Api>("api")
    .WithReference(sql)
    .WithHttpHealthCheck("/health")
    .WithUrlForEndpoint("http", url => url.Url += "/scalar/v1")
    .WaitForCompletion(migrations);

builder.Build().Run();
