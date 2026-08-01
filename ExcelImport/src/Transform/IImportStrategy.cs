using ExcelImport.Data;
using ExcelImport.Staging;

namespace ExcelImport.Transform;

public interface IImportStrategy
{
    string FileType { get; }
    Task ProcessChunkAsync(IReadOnlyList<ImportRow> rows, ImportContext db, CancellationToken cancellationToken = default);
}
