using Api.Features.SampleRecord;

namespace Api.Tests.Builders;

/// <summary>
/// Defaults set every property to a non-default value, so <c>Create().Build()</c> is the
/// "fully filled row" the mapper test needs.
/// </summary>
public class SampleRecordExcelRowBuilder
{
    private string _externalKey = "SR-1";
    private SampleRecordType _type = SampleRecordType.B;
    private int? _priority = 5;
    private string? _ediCode = "EDI-1";
    private string? _ediPartner = "Partner";

    public static SampleRecordExcelRowBuilder Create() => new();

    public SampleRecordExcelRowBuilder WithExternalKey(string externalKey)
    {
        _externalKey = externalKey;
        return this;
    }

    public SampleRecordExcelRowBuilder WithType(SampleRecordType type)
    {
        _type = type;
        return this;
    }

    public SampleRecordExcelRowBuilder WithPriority(int? priority)
    {
        _priority = priority;
        return this;
    }

    public SampleRecordExcelRow Build() =>
        new(
            _externalKey,
            _type,
            CustId: "CUST-1",
            _priority,
            Currency: "USD",
            PaymentTermDays: 30,
            _ediCode,
            _ediPartner,
            Description: "Imported",
            Reference: "REF-1",
            Amount: 100m,
            Quantity: 2.5m,
            OrderDate: new DateOnly(2026, 1, 15),
            DueDate: new DateOnly(2026, 2, 15)
        );
}
