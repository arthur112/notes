namespace ExcelImport.Staging;

public readonly record struct StagedRow(int RowNumber, string RawJson);

public interface IStagingReader
{
    IAsyncEnumerable<StagedRow> ReadRowsAsync(string path, CancellationToken cancellationToken);
}
