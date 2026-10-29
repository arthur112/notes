using System.Net;
using System.Net.Http.Json;
using Api.Features.SampleRecord;
using Api.Tests.Builders;
using Microsoft.EntityFrameworkCore;

namespace Api.Tests;

public class SampleRecordTests : DatabaseTestBase
{
    [Test]
    public async Task Create_Applies_OnCreate_And_Always_Rules()
    {
        var client = Factory.CreateClient();
        await SeedAsync(
            CustomerSettingsEntityBuilder
                .Create()
                .WithDefaultPaymentTermDays(45)
                .WithForcedCurrency("EUR")
                .Build()
        );

        var created = await client.PostAsJsonAsync(
            "/api/sample-records",
            CreateSampleRecordRequestBuilder
                .Create()
                .WithType(SampleRecordType.A)
                .WithPriority(null)
                .WithCurrency("USD")
                .WithPaymentTermDays(null)
                .WithEdi("EDI-1", "Partner")
                .Build()
        );
        await Assert.That(created.StatusCode).IsEqualTo(HttpStatusCode.Created);

        var body = await created.Content.ReadFromJsonAsync<SampleRecordResponse>();
        await Assert.That(body).IsNotNull();
        await Assert.That(body!.Priority).IsEqualTo(1);
        await Assert.That(body.PaymentTermDays).IsEqualTo(45);
        await Assert.That(body.Currency).IsEqualTo("EUR");
        await Assert.That(body.EdiCode).IsEqualTo("EDI-1");
        await Assert.That(body.CreatedAt).IsNotEqualTo(default(DateTimeOffset));
    }

    [Test]
    public async Task Update_Does_Not_Reapply_OnCreate_Rules()
    {
        var client = Factory.CreateClient();
        await SeedAsync(
            CustomerSettingsEntityBuilder.Create().WithDefaultPaymentTermDays(45).Build()
        );
        var record = await SeedAsync(
            SampleRecordEntityBuilder.Create().WithType(SampleRecordType.A).WithPriority(1).Build()
        );

        var updated = await client.PutAsJsonAsync(
            $"/api/sample-records/{record.PublicId}",
            UpdateSampleRecordRequestBuilder
                .Create()
                .WithType(SampleRecordType.A)
                .WithPriority(7)
                .WithPaymentTermDays(null)
                .Build()
        );
        await Assert.That(updated.StatusCode).IsEqualTo(HttpStatusCode.OK);

        var body = await updated.Content.ReadFromJsonAsync<SampleRecordResponse>();
        await Assert.That(body).IsNotNull();
        await Assert.That(body!.Priority).IsEqualTo(7);
        await Assert.That(body.PaymentTermDays).IsNull();
    }

    [Test]
    public async Task Import_Creates_New_Rows_And_Updates_Existing_Ones()
    {
        var client = Factory.CreateClient();
        await SeedAsync(CustomerSettingsEntityBuilder.Create().WithForcedCurrency("EUR").Build());
        await SeedAsync(
            SampleRecordEntityBuilder
                .Create()
                .WithExternalKey("SR-EXISTING")
                .WithType(SampleRecordType.A)
                .WithEdi("EDI-OLD", "Old partner")
                .Build()
        );

        var response = await client.PostAsJsonAsync(
            "/api/sample-records/import",
            new ImportSampleRecords.Request(
                [
                    SampleRecordExcelRowBuilder
                        .Create()
                        .WithExternalKey("SR-EXISTING")
                        .WithType(SampleRecordType.B)
                        .WithPriority(9)
                        .Build(),
                    SampleRecordExcelRowBuilder
                        .Create()
                        .WithExternalKey("SR-NEW")
                        .WithType(SampleRecordType.A)
                        .WithPriority(9)
                        .Build(),
                ]
            )
        );
        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.OK);
        var counts = await response.Content.ReadFromJsonAsync<ImportSampleRecords.Response>();
        await Assert.That(counts).IsEqualTo(new ImportSampleRecords.Response(Created: 1, Updated: 1));

        await using var db = CreateDbContext();
        var records = await db.SampleRecords.ToDictionaryAsync(r => r.ExternalKey);
        await Assert.That(records.Count).IsEqualTo(2);

        // Update path: OnCreate skipped (priority kept), A -> B clears EDI, currency forced.
        var existing = records["SR-EXISTING"];
        await Assert.That(existing.Type).IsEqualTo(SampleRecordType.B);
        await Assert.That(existing.Priority).IsEqualTo(9);
        await Assert.That(existing.EdiCode).IsNull();
        await Assert.That(existing.Currency).IsEqualTo("EUR");

        // Create path: OnCreate applied, type A keeps EDI, currency forced.
        var created = records["SR-NEW"];
        await Assert.That(created.Priority).IsEqualTo(1);
        await Assert.That(created.EdiCode).IsEqualTo("EDI-1");
        await Assert.That(created.Currency).IsEqualTo("EUR");
    }

    [Test]
    public async Task Get_Unknown_Returns_NotFound()
    {
        var client = Factory.CreateClient();

        var response = await client.GetAsync($"/api/sample-records/{Guid.NewGuid()}");

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.NotFound);
    }
}
