using System.Net;
using System.Net.Http.Json;
using Api.Auth;
using Api.Tests.Builders;

namespace Api.Tests;

/// <summary>
/// Scope = what the app may do, role = what the user may do. Reads need the area's read scope;
/// writing an order needs <c>orders.write</c> AND <c>order-editor</c>. No valid token is a 401, a
/// valid token missing a requirement is a 403.
/// </summary>
public class OrdersAuthorizationTests : DatabaseTestBase
{
    [Test]
    public async Task No_Token_Returns_Unauthorized_Problem()
    {
        var response = await Factory.CreateClient().GetAsync("/api/orders");

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.Unauthorized);
        await Assert
            .That(response.Content.Headers.ContentType?.MediaType)
            .IsEqualTo("application/problem+json");
    }

    [Test]
    public async Task Read_Scope_Is_Per_Area()
    {
        var client = CreateClient(Scopes.OrdersRead);

        var orders = await client.GetAsync("/api/orders");
        var customers = await client.GetAsync("/api/customers");

        await Assert.That(orders.StatusCode).IsEqualTo(HttpStatusCode.OK);
        await Assert.That(customers.StatusCode).IsEqualTo(HttpStatusCode.Forbidden);
    }

    [Test]
    [Arguments(true, false, HttpStatusCode.Forbidden)] // the app may write, the user may not
    [Arguments(false, true, HttpStatusCode.Forbidden)] // the user may write, the app may not
    [Arguments(true, true, HttpStatusCode.Created)]
    public async Task Create_Needs_Write_Scope_And_Editor_Role(
        bool hasScope,
        bool hasRole,
        HttpStatusCode expected
    )
    {
        await SeedAsync(CustomerEntityBuilder.Create().WithName("Acme").Build());
        var client = CreateClient(
            hasScope ? [Scopes.OrdersRead, Scopes.OrdersWrite] : [Scopes.OrdersRead],
            roles: hasRole ? [Roles.OrderEditor] : []
        );

        var response = await client.PostAsJsonAsync("/api/orders", OrderInputBuilder.For("Acme").Build());

        await Assert.That(response.StatusCode).IsEqualTo(expected);
    }

    // Keycloak/ADFS issue one space-delimited `scope` claim instead of one claim per scope.
    [Test]
    public async Task Space_Delimited_Scope_Claim_Is_Accepted()
    {
        var client = CreateClient($"{Scopes.CustomersRead} {Scopes.OrdersRead}");

        var response = await client.GetAsync("/api/customers/options");

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.OK);
    }
}
