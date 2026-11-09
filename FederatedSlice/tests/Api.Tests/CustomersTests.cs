using System.Net;
using System.Net.Http.Json;
using Api.Auth;
using Api.Features.Customers;
using Api.Tests.Builders;

namespace Api.Tests;

/// <summary>
/// The filters below are the strings the front's customers filter builds
/// (web/src/domains/customers/filter.ts, via web/src/shared/filtering/field-queries.ts).
/// </summary>
public class CustomersTests : DatabaseTestBase
{
    private async Task<TestPagedResult<ListCustomers.CustomerRow>> ListAsync(string filter) =>
        (
            await CreateClient(Scopes.CustomersRead)
                .GetFromJsonAsync<TestPagedResult<ListCustomers.CustomerRow>>(
                    $"/api/customers?orderBy=name&filter={Uri.EscapeDataString(filter)}"
                )
        )!;

    [Test]
    public async Task Customer_Numbers_Come_From_The_Identity()
    {
        var customer = await SeedAsync(CustomerEntityBuilder.Create().Build());

        await Assert.That(customer.CustomerNo).IsEqualTo($"CUS-{customer.Id}");
        await Assert.That(customer.Id).IsGreaterThanOrEqualTo(1001);
    }

    [Test]
    public async Task Options_Are_Sorted_By_Name()
    {
        await SeedAsync(CustomerEntityBuilder.Create().WithName("Globex").Build());
        await SeedAsync(CustomerEntityBuilder.Create().WithName("Acme").Build());

        var options = await CreateClient(Scopes.CustomersRead)
            .GetFromJsonAsync<List<ListCustomerOptions.CustomerOption>>("/api/customers/options");

        await Assert.That(options!.Select(o => o.Name)).IsEquivalentTo(["Acme", "Globex"]);
    }

    [Test]
    public async Task Multi_Select_Ors_Values_With_Spaces()
    {
        await SeedAsync(CustomerEntityBuilder.Create().WithName("A").WithCountry("United Kingdom").Build());
        await SeedAsync(CustomerEntityBuilder.Create().WithName("B").WithCountry("Sweden").Build());
        await SeedAsync(CustomerEntityBuilder.Create().WithName("C").WithCountry("Germany").Build());

        var page = await ListAsync("(country=United Kingdom|country=Sweden)");

        await Assert.That(page.Data.Select(c => c.Name)).IsEquivalentTo(["A", "B"]);
    }

    [Test]
    public async Task Flags_Match_Any_Of_Several_Boolean_Columns()
    {
        await SeedAsync(CustomerEntityBuilder.Create().WithName("Vip on hold").Vip().OnHold().Build());
        await SeedAsync(CustomerEntityBuilder.Create().WithName("Plain").Build());
        await SeedAsync(CustomerEntityBuilder.Create().WithName("On hold").OnHold().Build());

        // VIP or "Not on hold".
        var page = await ListAsync("(isVip=true|isOnHold=false)");

        await Assert.That(page.Data.Select(c => c.Name)).IsEquivalentTo(["Plain", "Vip on hold"]);
    }

    [Test]
    public async Task Day_Range_Is_Inclusive_At_Both_Ends()
    {
        await SeedAsync(CustomerEntityBuilder.Create().WithName("Before").WithCreatedAt(new(2025, 12, 31)).Build());
        await SeedAsync(CustomerEntityBuilder.Create().WithName("First").WithCreatedAt(new(2026, 1, 1)).Build());
        await SeedAsync(CustomerEntityBuilder.Create().WithName("Last").WithCreatedAt(new(2026, 1, 31)).Build());
        await SeedAsync(CustomerEntityBuilder.Create().WithName("After").WithCreatedAt(new(2026, 2, 1)).Build());

        var page = await ListAsync("createdAt>=2026-01-01T00:00:00Z,createdAt<=2026-01-31T23:59:59.999Z");

        await Assert.That(page.Data.Select(c => c.Name)).IsEquivalentTo(["First", "Last"]);
    }

    [Test]
    public async Task Search_And_Select_Combine()
    {
        await SeedAsync(CustomerEntityBuilder.Create().WithName("Acme SMB").WithSegment(Segment.SMB).Build());
        await SeedAsync(CustomerEntityBuilder.Create().WithName("Acme Enterprise").WithSegment(Segment.Enterprise).Build());

        var page = await ListAsync("(name=*acme|email=*acme),segment=Enterprise");

        await Assert.That(page.Data.Select(c => c.Name)).IsEquivalentTo(["Acme Enterprise"]);
        await Assert.That(page.Count).IsEqualTo(1);
    }

    [Test]
    public async Task Unknown_Field_Is_A_Bad_Request()
    {
        var response = await CreateClient(Scopes.CustomersRead).GetAsync("/api/customers?filter=bogus=1");

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.BadRequest);
        await Assert
            .That(response.Content.Headers.ContentType?.MediaType)
            .IsEqualTo("application/problem+json");
    }
}
