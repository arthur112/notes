using ExcelImport.Data;
using ExcelImport.Staging;
using Microsoft.EntityFrameworkCore;

namespace ExcelImport.Transform;

public static class Transformer
{
    public static async Task<int> ProcessNextChunkAsync(ImportContext db, ImportStrategyResolver resolver, int batchId, int chunkSize, CancellationToken cancellationToken = default)
    {
        var rows = await db.Rows
            .Where(r => r.BatchId == batchId && r.Status == RowStatus.Pending)
            .OrderBy(r => r.Id)
            .Take(chunkSize)
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return 0;
        }

        var fileType = await db.Batches
            .Where(b => b.Id == batchId)
            .Select(b => b.FileType)
            .SingleAsync(cancellationToken);

        await resolver.Resolve(fileType).ProcessChunkAsync(rows, db, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        var processed = rows.Count(r => r.Status == RowStatus.Processed);
        var failed = rows.Count(r => r.Status == RowStatus.Failed);
        await db.Batches.Where(b => b.Id == batchId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(b => b.ProcessedRows, b => b.ProcessedRows + processed)
                .SetProperty(b => b.FailedRows, b => b.FailedRows + failed), cancellationToken);

        db.ChangeTracker.Clear();
        return rows.Count;
    }
}
