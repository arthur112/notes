using Api.Features.Fund;
using Api.Tests.Builders;

namespace Api.Tests;

public class FundValidatorTests
{
    [Test]
    [Arguments("")]
    [Arguments(" ")]
    public async Task Validator_Rejects_Empty_Name(string name) =>
        await AssertCreateAndUpdateInvalid(
            CreateFundRequestBuilder.Create().WithName(name).Build(),
            UpdateFundRequestBuilder.Create().WithName(name).Build(),
            "Name"
        );

    [Test]
    public async Task Validator_Rejects_TooLong_Name() =>
        await AssertCreateAndUpdateInvalid(
            CreateFundRequestBuilder.Create().WithName(new string('a', 201)).Build(),
            UpdateFundRequestBuilder.Create().WithName(new string('a', 201)).Build(),
            "Name"
        );

    [Test]
    public async Task Validator_Rejects_Invalid_Periodicity() =>
        await AssertCreateAndUpdateInvalid(
            CreateFundRequestBuilder.Create().WithPeriodicity((Periodicity)999).Build(),
            UpdateFundRequestBuilder.Create().WithPeriodicity((Periodicity)999).Build(),
            "Periodicity"
        );

    [Test]
    [Arguments("[1,2]")]
    [Arguments("\"text\"")]
    [Arguments("42")]
    public async Task Validator_Rejects_NonObject_PermanentInformation(string permanentInformation)
    {
        var updateResults = RequestValidation.Validate(
            UpdateFundRequestBuilder.Create().WithPermanentInformation(permanentInformation).Build()
        );

        await Assert.That(updateResults).IsNotEmpty();
        await Assert
            .That(updateResults.SelectMany(r => r.MemberNames))
            .Contains("PermanentInformation");
    }

    [Test]
    public async Task Validator_Accepts_Omitted_Optional_Fields_On_Update()
    {
        var updateResults = RequestValidation.Validate(
            UpdateFundRequestBuilder
                .Create()
                .WithName(null)
                .WithPermanentInformation(null)
                .WithPeriodicity(null)
                .Build()
        );

        await Assert.That(updateResults).IsEmpty();
    }

    [Test]
    public async Task Validator_Accepts_Valid_Request()
    {
        var createResults = RequestValidation.Validate(CreateFundRequestBuilder.Create().Build());
        var updateResults = RequestValidation.Validate(UpdateFundRequestBuilder.Create().Build());

        await Assert.That(createResults).IsEmpty();
        await Assert.That(updateResults).IsEmpty();
    }

    private static async Task AssertCreateAndUpdateInvalid(
        CreateFund.Request createRequest,
        UpdateFund.Request updateRequest,
        string propertyName
    )
    {
        var createResults = RequestValidation.Validate(createRequest);
        var updateResults = RequestValidation.Validate(updateRequest);

        foreach (var results in new[] { createResults, updateResults })
        {
            await Assert.That(results).IsNotEmpty();
            await Assert.That(results.SelectMany(r => r.MemberNames)).Contains(propertyName);
        }
    }
}
