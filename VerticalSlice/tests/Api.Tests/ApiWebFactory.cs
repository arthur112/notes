using Microsoft.Extensions.Configuration;
using TUnit.AspNetCore;

namespace Api.Tests;

public class ApiWebFactory : TestWebApplicationFactory<Program>
{
    [ClassDataSource<AppFixture>(Shared = SharedType.PerTestSession)]
    public AppFixture Aspire { get; init; } = null!;

    protected override void ConfigureStartupConfiguration(
        IConfigurationBuilder configurationBuilder
    ) =>
        configurationBuilder.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["ConnectionStrings:app"] = Aspire.ConnectionString,
            }
        );
}
