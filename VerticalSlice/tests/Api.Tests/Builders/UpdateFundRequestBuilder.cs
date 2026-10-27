using System.Text.Json;
using Api.Features.Fund;

namespace Api.Tests.Builders;

public class UpdateFundRequestBuilder
{
    private string? _name = "Test Fund";
    private JsonElement? _permanentInformation;
    private Periodicity? _periodicity = Periodicity.Quarterly;

    public static UpdateFundRequestBuilder Create() => new();

    public UpdateFundRequestBuilder WithName(string? name)
    {
        _name = name;
        return this;
    }

    public UpdateFundRequestBuilder WithPermanentInformation(string? permanentInformation)
    {
        _permanentInformation = permanentInformation is null
            ? null
            : JsonDocument.Parse(permanentInformation).RootElement;
        return this;
    }

    public UpdateFundRequestBuilder WithPeriodicity(Periodicity? periodicity)
    {
        _periodicity = periodicity;
        return this;
    }

    public UpdateFund.Request Build() => new(_name, _permanentInformation, _periodicity);
}
