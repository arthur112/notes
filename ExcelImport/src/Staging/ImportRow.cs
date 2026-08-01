namespace ExcelImport.Staging;

public enum RowStatus
{
    Pending,
    Processed,
    Failed
}

public class ImportRow
{
    public int Id { get; set; }
    public int BatchId { get; set; }
    public ImportBatch Batch { get; set; } = null!;
    public int RowNumber { get; set; }
    public required string RawJson { get; set; }
    public RowStatus Status { get; set; }
    public string? Error { get; set; }
}
