using System.Net;
using System.Net.Http.Json;
using Api.Auth;
using Api.Tests.Builders;

namespace Api.Tests;

/// <summary>
/// The token's scopes decide which Fund operations run: no valid token is a 401, a valid token
/// missing the operation's scope is a 403. Delete also needs the user's <c>fund-admin</c> role.
/// </summary>
public class FundAuthorizationTests : DatabaseTestBase
{
    [Test]
    public async Task No_Token_Returns_Unauthorized()
    {
        var response = await Factory.CreateClient().GetAsync("/api/funds");

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.Unauthorized);
    }

    [Test]
    public async Task Read_Scope_Can_List_But_Not_Create()
    {
        var client = CreateClient(Scopes.FundsRead);

        var list = await client.GetAsync("/api/funds");
        var create = await client.PostAsJsonAsync(
            "/api/funds",
            CreateFundRequestBuilder.Create().Build()
        );

        await Assert.That(list.StatusCode).IsEqualTo(HttpStatusCode.OK);
        await Assert.That(create.StatusCode).IsEqualTo(HttpStatusCode.Forbidden);
    }

    [Test]
    public async Task Write_Scope_Can_Create_And_Update_But_Not_Delete()
    {
        var client = CreateClient(Scopes.FundsRead, Scopes.FundsWrite);

        var create = await client.PostAsJsonAsync(
            "/api/funds",
            CreateFundRequestBuilder.Create().Build()
        );
        var fund = await SeedAsync(FundEntityBuilder.Create().Build());
        var update = await client.PutAsJsonAsync(
            $"/api/funds/{fund.PublicId}",
            UpdateFundRequestBuilder.Create().Build()
        );
        var delete = await client.DeleteAsync($"/api/funds/{fund.PublicId}");

        await Assert.That(create.StatusCode).IsEqualTo(HttpStatusCode.Created);
        await Assert.That(update.StatusCode).IsEqualTo(HttpStatusCode.OK);
        await Assert.That(delete.StatusCode).IsEqualTo(HttpStatusCode.Forbidden);
    }

    // Scope = what the app may do, role = what the user may do: delete needs both.
    [Test]
    [Arguments(true, false, HttpStatusCode.Forbidden)] // the app may delete, the user may not
    [Arguments(false, true, HttpStatusCode.Forbidden)] // the user may delete, the app may not
    [Arguments(true, true, HttpStatusCode.NoContent)]
    public async Task Delete_Needs_Delete_Scope_And_Admin_Role(
        bool hasScope,
        bool hasRole,
        HttpStatusCode expected
    )
    {
        var fund = await SeedAsync(FundEntityBuilder.Create().Build());
        var client = CreateClient(
            hasScope ? [Scopes.FundsRead, Scopes.FundsDelete] : [Scopes.FundsRead],
            roles: hasRole ? [Roles.FundAdmin] : []
        );

        var response = await client.DeleteAsync($"/api/funds/{fund.PublicId}");

        await Assert.That(response.StatusCode).IsEqualTo(expected);
    }

    // Keycloak/ADFS issue one space-delimited `scope` claim instead of one claim per scope.
    [Test]
    public async Task Space_Delimited_Scope_Claim_Is_Accepted()
    {
        var client = CreateClient($"{Scopes.FundsRead} {Scopes.FundsWrite}");

        var create = await client.PostAsJsonAsync(
            "/api/funds",
            CreateFundRequestBuilder.Create().Build()
        );

        await Assert.That(create.StatusCode).IsEqualTo(HttpStatusCode.Created);
    }
}
