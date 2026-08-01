namespace ExcelImport.Staging;

public enum BatchStatus
{
    Open,
    Staged,
    Completed
}

public class ImportBatch
{
    public int Id { get; set; }
    public required string FileName { get; set; }
    public required string FileType { get; set; }
    public DateTime ImportedAt { get; set; }
    public BatchStatus Status { get; set; }
    public int TotalRows { get; set; }
    public int ProcessedRows { get; set; }
    public int FailedRows { get; set; }
    public List<ImportRow> Rows { get; set; } = [];
}
