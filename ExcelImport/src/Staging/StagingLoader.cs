using Microsoft.EntityFrameworkCore;

namespace ExcelImport.Staging;

public static class StagingLoader
{
    private const int ChunkSize = 1000;

    public static async Task<int> LoadAsync(string path, Data.ImportContext db, CancellationToken cancellationToken = default)
    {
        var batch = new ImportBatch
        {
            FileName = Path.GetFileName(path),
            FileType = InferFileType(path),
            ImportedAt = DateTime.UtcNow,
            Status = BatchStatus.Open
        };
        db.Batches.Add(batch);
        await db.SaveChangesAsync(cancellationToken);
        db.ChangeTracker.Clear();

        var reader = SelectReader(path);
        var totalRows = 0;
        var buffer = new List<ImportRow>(ChunkSize);
        await foreach (var (rowNumber, rawJson) in reader.ReadRowsAsync(path, cancellationToken))
        {
            totalRows++;
            buffer.Add(new ImportRow
            {
                BatchId = batch.Id,
                RowNumber = rowNumber,
                RawJson = rawJson,
                Status = RowStatus.Pending
            });

            if (buffer.Count == ChunkSize)
            {
                db.Rows.AddRange(buffer);
                await db.SaveChangesAsync(cancellationToken);
                db.ChangeTracker.Clear();
                buffer.Clear();
            }
        }

        if (buffer.Count > 0)
        {
            db.Rows.AddRange(buffer);
            await db.SaveChangesAsync(cancellationToken);
            db.ChangeTracker.Clear();
        }

        await db.Batches.Where(b => b.Id == batch.Id)
            .ExecuteUpdateAsync(s => s
                .SetProperty(b => b.TotalRows, totalRows)
                .SetProperty(b => b.Status, BatchStatus.Staged), cancellationToken);

        return batch.Id;
    }

    private static IStagingReader SelectReader(string path) =>
        Path.GetExtension(path).ToLowerInvariant() switch
        {
            ".txt" or ".csv" => new DelimitedStagingReader(),
            _ => new ExcelStagingReader()
        };

    private static string InferFileType(string path)
    {
        var fileName = Path.GetFileNameWithoutExtension(path);
        if (fileName.Contains("orders", StringComparison.OrdinalIgnoreCase))
        {
            return "orders";
        }
        if (fileName.Contains("inventory", StringComparison.OrdinalIgnoreCase))
        {
            return "inventory";
        }
        throw new InvalidOperationException($"Cannot infer file type from '{Path.GetFileName(path)}'.");
    }
}
