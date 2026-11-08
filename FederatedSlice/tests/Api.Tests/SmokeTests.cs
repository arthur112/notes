using System.Net;
using Microsoft.Data.SqlClient;
using TUnit.Aspire;

namespace Api.Tests;

/// <summary>The real AppHost: SQL Server container, grate (schema + seed), api.</summary>
[ClassDataSource<AppFixture>(Shared = SharedType.PerTestSession)]
public class SmokeTests(AppFixture fixture)
{
    [Test]
    public async Task Grate_Seeds_The_Demo_Data_And_The_Api_Is_Healthy()
    {
        Skip.When(
            AppFixture.ExternalConnectionString is not null,
            "An existing test database is configured, so the AppHost is not started."
        );

        await using var connection = new SqlConnection(fixture.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText =
            "SELECT (SELECT COUNT(*) FROM customers), (SELECT COUNT(*) FROM orders), (SELECT COUNT(*) FROM customer_settings)";
        await using var reader = await command.ExecuteReaderAsync();
        await reader.ReadAsync();

        await Assert.That((reader.GetInt32(0), reader.GetInt32(1), reader.GetInt32(2))).IsEqualTo((12, 6, 2));
        // The data routes need a token; health doesn't.
        var health = await fixture.CreateHttpClient("api").GetAsync("/health");
        await Assert.That(health.StatusCode).IsEqualTo(HttpStatusCode.OK);
    }
}
