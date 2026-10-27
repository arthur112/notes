using Api.Features.Fund;

namespace Api.Tests.Builders;

public class FundEntityBuilder
{
    private string _name = "Test Fund";
    private string? _permanentInformation;
    private Periodicity _periodicity = Periodicity.Quarterly;

    public static FundEntityBuilder Create() => new();

    public FundEntityBuilder WithName(string name)
    {
        _name = name;
        return this;
    }

    public FundEntityBuilder WithPermanentInformation(string? permanentInformation)
    {
        _permanentInformation = permanentInformation;
        return this;
    }

    public FundEntityBuilder WithPeriodicity(Periodicity periodicity)
    {
        _periodicity = periodicity;
        return this;
    }

    public FundEntity Build() =>
        new()
        {
            Name = _name,
            PermanentInformation = _permanentInformation,
            Periodicity = _periodicity,
        };
}
