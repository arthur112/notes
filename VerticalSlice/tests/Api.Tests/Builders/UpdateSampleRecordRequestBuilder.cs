using Api.Features.SampleRecord;

namespace Api.Tests.Builders;

public class UpdateSampleRecordRequestBuilder
{
    private SampleRecordType _type = SampleRecordType.A;
    private string _custId = "CUST-1";
    private int? _priority;
    private int? _paymentTermDays;

    public static UpdateSampleRecordRequestBuilder Create() => new();

    public UpdateSampleRecordRequestBuilder WithType(SampleRecordType type)
    {
        _type = type;
        return this;
    }

    public UpdateSampleRecordRequestBuilder WithPriority(int? priority)
    {
        _priority = priority;
        return this;
    }

    public UpdateSampleRecordRequestBuilder WithPaymentTermDays(int? paymentTermDays)
    {
        _paymentTermDays = paymentTermDays;
        return this;
    }

    public UpdateSampleRecord.Request Build() =>
        new(
            _type,
            _custId,
            _priority,
            Currency: null,
            _paymentTermDays,
            EdiCode: null,
            EdiPartner: null,
            Description: null,
            Reference: null,
            Amount: 100m,
            Quantity: null,
            OrderDate: new DateOnly(2026, 1, 15),
            DueDate: null
        );
}
