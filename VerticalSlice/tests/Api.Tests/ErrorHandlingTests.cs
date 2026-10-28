using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using TUnit.Aspire;

namespace Api.Tests;

[ClassDataSource<AppFixture>(Shared = SharedType.PerTestSession)]
public class ErrorHandlingTests(AppFixture fixture)
{
    [Test]
    public async Task Unhandled_Exception_Returns_Problem_Details()
    {
        Skip.When(
            AppFixture.ExternalConnectionString is not null,
            "An existing test database is configured, so the AppHost is not started."
        );
        var client = fixture.CreateHttpClient("api");

        var response = await client.GetAsync("/error/throw");

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.InternalServerError);
        await Assert
            .That(response.Content.Headers.ContentType?.MediaType)
            .IsEqualTo("application/problem+json");

        var body = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        await Assert.That(body).IsNotNull();
        await Assert.That(body!.Status).IsEqualTo(500);
        await Assert.That(body.Type).IsEqualTo(nameof(InvalidOperationException));
    }
}

/// <summary>
/// Domain errors implement <see cref="Api.ErrorHandling.IHttpError"/> and render themselves, so
/// their RFC 9457 shape needs its own regression checks. Separate from
/// <see cref="ErrorHandlingTests"/> because these run against the per-test schema; that class
/// stays a smoke test of the real Aspire wiring.
/// </summary>
public class HttpErrorResponseTests : DatabaseTestBase
{
    [Test]
    public async Task NotFoundError_Returns_Problem_Details_With_Status()
    {
        var client = Factory.CreateClient();

        var response = await client.GetAsync($"/api/funds/{Guid.NewGuid()}");

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.NotFound);
        await Assert
            .That(response.Content.Headers.ContentType?.MediaType)
            .IsEqualTo("application/problem+json");
        var body = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        await Assert.That(body).IsNotNull();
        await Assert.That(body!.Status).IsEqualTo(404);
    }
}
