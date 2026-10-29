namespace Api.Features.SampleRecord;

/// <summary>
/// Shared by every SampleRecord use case: with this many columns, one copy per slice (as Fund
/// does) would only be duplication.
/// </summary>
public record SampleRecordResponse(
    Guid PublicId,
    string ExternalKey,
    SampleRecordType Type,
    string CustId,
    int? Priority,
    string? Currency,
    int? PaymentTermDays,
    string? EdiCode,
    string? EdiPartner,
    string? Description,
    string? Reference,
    decimal Amount,
    decimal? Quantity,
    DateOnly OrderDate,
    DateOnly? DueDate,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);
