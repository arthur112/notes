using Parallelism.Domain;
using Parallelism.Parsing;
using System.Threading.Tasks.Dataflow;

namespace Parallelism.Pipeline;

public sealed class ImportPipeline(IRowParser parser, string connectionString)
{
    private const int BatchSize = 10_000;

    public async Task<long> StageAsync(string path, CancellationToken cancellationToken)
    {
        var processBlock = new TransformBlock<string[], StagedOrder>(
            RowProcessor.Process,
            new ExecutionDataflowBlockOptions
            {
                MaxDegreeOfParallelism = Environment.ProcessorCount,
                BoundedCapacity = Environment.ProcessorCount * 32,
                CancellationToken = cancellationToken,
            });

        var batchBlock = new BatchBlock<StagedOrder>(
            BatchSize,
            new GroupingDataflowBlockOptions
            {
                BoundedCapacity = BatchSize * 8,
                CancellationToken = cancellationToken,
            });

        var insertBlock = new ActionBlock<StagedOrder[]>(
            batch => SqlBulkFlush.FlushAsync(connectionString, batch, cancellationToken),
            new ExecutionDataflowBlockOptions
            {
                MaxDegreeOfParallelism = 1,
                BoundedCapacity = 4,
                CancellationToken = cancellationToken,
            });

        var linkOptions = new DataflowLinkOptions { PropagateCompletion = true };
        processBlock.LinkTo(batchBlock, linkOptions);
        batchBlock.LinkTo(insertBlock, linkOptions);

        long rows = 0;
        await foreach (var values in parser.ReadRowsAsync(path, cancellationToken))
        {
            await processBlock.SendAsync(values, cancellationToken);
            rows++;
        }
        processBlock.Complete();
        await insertBlock.Completion;
        return rows;
    }

    public Task NormalizeAsync(CancellationToken cancellationToken) =>
        Normalizer.NormalizeAsync(connectionString, cancellationToken);
}
