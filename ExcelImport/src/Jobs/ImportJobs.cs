using ExcelImport.Data;
using ExcelImport.Staging;
using ExcelImport.Transform;
using Microsoft.EntityFrameworkCore;
using TickerQ.Utilities;
using TickerQ.Utilities.Base;
using TickerQ.Utilities.Entities;
using TickerQ.Utilities.Interfaces.Managers;

namespace ExcelImport.Jobs;

public class ImportJobs(
    IDbContextFactory<ImportContext> dbFactory,
    ImportStrategyResolver resolver,
    ITimeTickerManager<TimeTickerEntity> timeTicker)
{
    private const int ChunkSize = 1000;

    [TickerFunction("StageFile")]
    public async Task StageFile(TickerFunctionContext<string> context, CancellationToken cancellationToken)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        var batchId = await StagingLoader.LoadAsync(context.Request, db, cancellationToken);

        await timeTicker.AddAsync(new TimeTickerEntity
        {
            Function = "TransformBatch",
            ExecutionTime = DateTime.UtcNow,
            Request = TickerHelper.CreateTickerRequest(batchId)
        }, cancellationToken);
    }

    [TickerFunction("TransformBatch")]
    public async Task TransformBatch(TickerFunctionContext<int> context, CancellationToken cancellationToken)
    {
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        var processed = await Transformer.ProcessNextChunkAsync(db, resolver, context.Request, ChunkSize, cancellationToken);

        if (processed > 0)
        {
            await timeTicker.AddAsync(new TimeTickerEntity
            {
                Function = "TransformBatch",
                ExecutionTime = DateTime.UtcNow.AddMilliseconds(200),
                Request = TickerHelper.CreateTickerRequest(context.Request)
            }, cancellationToken);
        }
        else
        {
            await db.Batches.Where(b => b.Id == context.Request)
                .ExecuteUpdateAsync(s => s.SetProperty(b => b.Status, BatchStatus.Completed), cancellationToken);
        }
    }
}
