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
                // Trust the tokens TestTokens mints, in place of the dotnet user-jwts ones.
                ["Authentication:Schemes:Bearer:ValidIssuer"] = TestTokens.Issuer,
                ["Authentication:Schemes:Bearer:ValidAudiences:0"] = TestTokens.Audience,
                ["Authentication:Schemes:Bearer:SigningKeys:0:Issuer"] = TestTokens.Issuer,
                ["Authentication:Schemes:Bearer:SigningKeys:0:Value"] = TestTokens.SigningKey,
            }
        );
}
