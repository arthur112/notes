using Microsoft.Extensions.Logging;
using Parallelism.Parsing;
using Parallelism.Pipeline;
using System.Diagnostics;
using TickerQ.Utilities.Base;

namespace Parallelism.Jobs;

public class ImportJobs(
    RowParserResolver parserResolver,
    ImportCompletion completion,
    ILogger<ImportJobs> logger,
    string connectionString)
{
    [TickerFunction("ImportFile")]
    public async Task ImportFile(TickerFunctionContext<string> context, CancellationToken cancellationToken)
    {
        var path = context.Request;
        var stopwatch = Stopwatch.StartNew();
        try
        {
            var pipeline = new ImportPipeline(parserResolver.Resolve(path), connectionString);

            var staged = await pipeline.StageAsync(path, cancellationToken);
            var stageElapsed = stopwatch.Elapsed;

            await pipeline.NormalizeAsync(cancellationToken);
            stopwatch.Stop();

            logger.LogInformation(
                "Imported {File}: {Rows:N0} rows staged in {StageMs:N0} ms, normalized in {NormalizeMs:N0} ms (total {TotalMs:N0} ms)",
                Path.GetFileName(path), staged,
                stageElapsed.TotalMilliseconds,
                (stopwatch.Elapsed - stageElapsed).TotalMilliseconds,
                stopwatch.Elapsed.TotalMilliseconds);

            completion.Complete(path, staged);
        }
        catch (Exception ex)
        {
            completion.Fail(path, ex);
            throw;
        }
    }
}
