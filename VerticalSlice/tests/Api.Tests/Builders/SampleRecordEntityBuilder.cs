using Api.Features.SampleRecord;

namespace Api.Tests.Builders;

public class SampleRecordEntityBuilder
{
    private string _externalKey = "SR-1";
    private SampleRecordType _type = SampleRecordType.A;
    private string _custId = "CUST-1";
    private int? _priority;
    private string? _currency;
    private int? _paymentTermDays;
    private string? _ediCode;
    private string? _ediPartner;

    public static SampleRecordEntityBuilder Create() => new();

    public SampleRecordEntityBuilder WithExternalKey(string externalKey)
    {
        _externalKey = externalKey;
        return this;
    }

    public SampleRecordEntityBuilder WithType(SampleRecordType type)
    {
        _type = type;
        return this;
    }

    public SampleRecordEntityBuilder WithCustId(string custId)
    {
        _custId = custId;
        return this;
    }

    public SampleRecordEntityBuilder WithPriority(int? priority)
    {
        _priority = priority;
        return this;
    }

    public SampleRecordEntityBuilder WithCurrency(string? currency)
    {
        _currency = currency;
        return this;
    }

    public SampleRecordEntityBuilder WithPaymentTermDays(int? paymentTermDays)
    {
        _paymentTermDays = paymentTermDays;
        return this;
    }

    public SampleRecordEntityBuilder WithEdi(string? ediCode, string? ediPartner)
    {
        _ediCode = ediCode;
        _ediPartner = ediPartner;
        return this;
    }

    public SampleRecordEntity Build() =>
        new()
        {
            ExternalKey = _externalKey,
            Type = _type,
            CustId = _custId,
            Priority = _priority,
            Currency = _currency,
            PaymentTermDays = _paymentTermDays,
            EdiCode = _ediCode,
            EdiPartner = _ediPartner,
            Amount = 100m,
            OrderDate = new DateOnly(2026, 1, 15),
        };
}
