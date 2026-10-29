namespace Api.Features.SampleRecord;

/// <summary>One row of the technical Excel file, already typed. Parsing is out of scope.</summary>
public record SampleRecordExcelRow(
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
    DateOnly? DueDate
);
