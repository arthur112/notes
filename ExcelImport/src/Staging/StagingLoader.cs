using ExcelDataReader;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text.Json;

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

        var totalRows = 0;
        using (var stream = File.OpenRead(path))
        using (var reader = ExcelReaderFactory.CreateReader(stream))
        {
            if (!reader.Read())
            {
                throw new InvalidOperationException($"File '{batch.FileName}' is empty.");
            }

            var headers = new string[reader.FieldCount];
            for (var i = 0; i < headers.Length; i++)
            {
                headers[i] = Convert.ToString(reader.GetValue(i), CultureInfo.InvariantCulture) ?? string.Empty;
            }

            var buffer = new List<ImportRow>(ChunkSize);
            while (reader.Read())
            {
                totalRows++;
                var values = new Dictionary<string, string>(headers.Length);
                for (var i = 0; i < headers.Length; i++)
                {
                    values[headers[i]] = i < reader.FieldCount
                        ? Convert.ToString(reader.GetValue(i), CultureInfo.InvariantCulture) ?? string.Empty
                        : string.Empty;
                }

                buffer.Add(new ImportRow
                {
                    BatchId = batch.Id,
                    RowNumber = totalRows + 1,
                    RawJson = JsonSerializer.Serialize(values),
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
        }

        await db.Batches.Where(b => b.Id == batch.Id)
            .ExecuteUpdateAsync(s => s
                .SetProperty(b => b.TotalRows, totalRows)
                .SetProperty(b => b.Status, BatchStatus.Staged), cancellationToken);

        return batch.Id;
    }

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
