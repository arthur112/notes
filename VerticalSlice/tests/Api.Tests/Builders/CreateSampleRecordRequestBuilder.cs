using Api.Features.SampleRecord;

namespace Api.Tests.Builders;

public class CreateSampleRecordRequestBuilder
{
    private string _externalKey = "SR-1";
    private SampleRecordType _type = SampleRecordType.A;
    private string _custId = "CUST-1";
    private int? _priority;
    private string? _currency;
    private int? _paymentTermDays;
    private string? _ediCode;
    private string? _ediPartner;

    public static CreateSampleRecordRequestBuilder Create() => new();

    public CreateSampleRecordRequestBuilder WithType(SampleRecordType type)
    {
        _type = type;
        return this;
    }

    public CreateSampleRecordRequestBuilder WithPriority(int? priority)
    {
        _priority = priority;
        return this;
    }

    public CreateSampleRecordRequestBuilder WithCurrency(string? currency)
    {
        _currency = currency;
        return this;
    }

    public CreateSampleRecordRequestBuilder WithPaymentTermDays(int? paymentTermDays)
    {
        _paymentTermDays = paymentTermDays;
        return this;
    }

    public CreateSampleRecordRequestBuilder WithEdi(string? ediCode, string? ediPartner)
    {
        _ediCode = ediCode;
        _ediPartner = ediPartner;
        return this;
    }

    public CreateSampleRecord.Request Build() =>
        new(
            _externalKey,
            _type,
            _custId,
            _priority,
            _currency,
            _paymentTermDays,
            _ediCode,
            _ediPartner,
            Description: null,
            Reference: null,
            Amount: 100m,
            Quantity: null,
            OrderDate: new DateOnly(2026, 1, 15),
            DueDate: null
        );
}
