extern alias AppHost;

using Microsoft.Extensions.Configuration;
using TUnit.Aspire;

namespace Api.Tests;

/// <summary>
/// The SQL Server the tests run against. Set <c>ConnectionStrings:TestDatabase</c> in
/// <c>appsettings.Tests.json</c> (or the <c>ConnectionStrings__TestDatabase</c> environment
/// variable) to use an existing database. Left empty, the real AppHost is started (SQL Server
/// container, grate, api).
/// </summary>
public class AppFixture : AspireFixture<AppHost::Projects.AppHost>
{
    public static readonly string? ExternalConnectionString =
        new ConfigurationBuilder()
            .AddJsonFile(Path.Combine(AppContext.BaseDirectory, "appsettings.Tests.json"))
            .AddEnvironmentVariables()
            .Build()
            .GetConnectionString("TestDatabase")
            is { Length: > 0 } connectionString
            ? connectionString
            : null;

    protected override ResourceWaitBehavior WaitBehavior => ResourceWaitBehavior.Named;

    protected override IEnumerable<string> ResourcesToWaitFor() => ["api"];

    public string ConnectionString { get; private set; } = null!;

    public override async Task InitializeAsync()
    {
        if (ExternalConnectionString is not null)
        {
            ConnectionString = ExternalConnectionString;
            return;
        }

        await base.InitializeAsync();

        ConnectionString =
            await GetConnectionStringAsync("app")
            ?? throw new InvalidOperationException("Connection string 'app' was not found.");
    }
}
