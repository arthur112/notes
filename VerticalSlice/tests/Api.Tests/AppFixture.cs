extern alias AppHost;

using TUnit.Aspire;

namespace Api.Tests;

public class AppFixture : AspireFixture<AppHost::Projects.AppHost>
{
    protected override ResourceWaitBehavior WaitBehavior => ResourceWaitBehavior.Named;

    protected override IEnumerable<string> ResourcesToWaitFor() => ["api"];

    public string PostgresConnectionString { get; private set; } = null!;

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();

        PostgresConnectionString =
            await GetConnectionStringAsync("app")
            ?? throw new InvalidOperationException("Connection string 'app' was not found.");
    }
}
