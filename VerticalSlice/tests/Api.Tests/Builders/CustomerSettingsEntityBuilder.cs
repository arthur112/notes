using Api.Features.SampleRecord;

namespace Api.Tests.Builders;

public class CustomerSettingsEntityBuilder
{
    private string _custId = "CUST-1";
    private int? _defaultPaymentTermDays;
    private string? _forcedCurrency;

    public static CustomerSettingsEntityBuilder Create() => new();

    public CustomerSettingsEntityBuilder WithCustId(string custId)
    {
        _custId = custId;
        return this;
    }

    public CustomerSettingsEntityBuilder WithDefaultPaymentTermDays(int? defaultPaymentTermDays)
    {
        _defaultPaymentTermDays = defaultPaymentTermDays;
        return this;
    }

    public CustomerSettingsEntityBuilder WithForcedCurrency(string? forcedCurrency)
    {
        _forcedCurrency = forcedCurrency;
        return this;
    }

    public CustomerSettingsEntity Build() =>
        new()
        {
            CustId = _custId,
            DefaultPaymentTermDays = _defaultPaymentTermDays,
            ForcedCurrency = _forcedCurrency,
        };
}
