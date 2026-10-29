using Api.Data;

namespace Api.Features.SampleRecord;

/// <summary>
/// Plain POCO with public setters on purpose: the write path is <c>new</c> (or load) →
/// <see cref="SampleRecordMapper"/> → <see cref="SampleRecordRules"/>, so there are no
/// <c>required</c> members.
/// </summary>
public class SampleRecordEntity : IAuditable
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public string ExternalKey { get; set; } = "";
    public SampleRecordType Type { get; set; }
    public string CustId { get; set; } = "";
    public int? Priority { get; set; }
    public string? Currency { get; set; }
    public int? PaymentTermDays { get; set; }
    public string? EdiCode { get; set; }
    public string? EdiPartner { get; set; }
    public string? Description { get; set; }
    public string? Reference { get; set; }
    public decimal Amount { get; set; }
    public decimal? Quantity { get; set; }
    public DateOnly OrderDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
