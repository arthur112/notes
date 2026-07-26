using CertificatCustomProvider.Configuration;
using DemoApi;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

if (builder.Environment.IsProduction())
{
    builder.Configuration.AddDpapiFile(
        Path.Combine(builder.Environment.ContentRootPath, "secrets.encrypted.json"));

    // Certificate variant (multi-server): swap the call above for
    // builder.Configuration.AddCertificateFile(
    //     Path.Combine(builder.Environment.ContentRootPath, "secrets.encrypted.json"),
    //     builder.Configuration["Secrets:CertificateThumbprint"]
    //         ?? throw new InvalidOperationException("Secrets:CertificateThumbprint missing"));
}

builder.Services.AddOptions<ConnectionStringsOptions>()
    .Bind(builder.Configuration.GetSection("ConnectionStrings"))
    .Validate(o => !string.IsNullOrWhiteSpace(o.MainDb), "ConnectionStrings:MainDb missing")
    .ValidateOnStart();

builder.Services.AddOptions<ExternalApiOptions>()
    .Bind(builder.Configuration.GetSection("ExternalApi"))
    .Validate(o => !string.IsNullOrWhiteSpace(o.ApiKey), "ExternalApi:ApiKey missing")
    .ValidateOnStart();

var app = builder.Build();

app.MapGet("/", (
    IOptions<ConnectionStringsOptions> connectionStrings,
    IOptions<ExternalApiOptions> externalApi) => Results.Ok(new
    {
        connectionStringsMainDb = Mask(connectionStrings.Value.MainDb!),
        externalApiKey = Mask(externalApi.Value.ApiKey!),
    }));

if (app.Environment.IsDevelopment())
{
    app.MapGet("/diag/config-source", () =>
    {
        var root = (IConfigurationRoot)app.Configuration;

        string? provider = root.Providers
            .Where(p => p.TryGet("ConnectionStrings:MainDb", out _))
            .Select(p => p.ToString())
            .FirstOrDefault();

        return Results.Ok(new
        {
            key = "ConnectionStrings:MainDb",
            suppliedBy = provider ?? "(not found)",
        });
    });
}

app.Run();

static string Mask(string value) =>
    value.Length <= 4 ? "****" : value[..2] + new string('*', value.Length - 4) + value[^2..];
