using Api.Features.Fund;

namespace Api.Tests.Builders;

public class CreateFundRequestBuilder
{
    private string _name = "Test Fund";
    private string? _permanentInformation;
    private Periodicity _periodicity = Periodicity.Quarterly;

    public static CreateFundRequestBuilder Create() => new();

    public CreateFundRequestBuilder WithName(string name)
    {
        _name = name;
        return this;
    }

    public CreateFundRequestBuilder WithPermanentInformation(string? permanentInformation)
    {
        _permanentInformation = permanentInformation;
        return this;
    }

    public CreateFundRequestBuilder WithPeriodicity(Periodicity periodicity)
    {
        _periodicity = periodicity;
        return this;
    }

    public CreateFund.Request Build() => new(_name, _permanentInformation, _periodicity);
}
