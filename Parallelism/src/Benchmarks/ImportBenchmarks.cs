using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Jobs;
using BenchmarkDotNet.Toolchains.InProcess.Emit;
using Microsoft.Extensions.DependencyInjection;
using Parallelism.Data;
using Parallelism.Jobs;
using TickerQ.Utilities;
using TickerQ.Utilities.Entities;
using TickerQ.Utilities.Interfaces.Managers;

namespace Parallelism.Benchmarks;

[Config(typeof(BenchmarkConfig))]
[MemoryDiagnoser(false)]
public class ImportBenchmarks
{
    private sealed class BenchmarkConfig : ManualConfig
    {
        public BenchmarkConfig()
        {
            AddJob(Job.Default
                .WithToolchain(InProcessEmitToolchain.Instance)
                .WithLaunchCount(1)
                .WithWarmupCount(0)
                .WithIterationCount(1)
                .WithInvocationCount(1)
                .WithUnrollFactor(1));
        }
    }

    [Params(10_000, 100_000, 1_000_000, 2_000_000)]
    public int Rows { get; set; }

    private string FilePath => Path.Combine(Program.DataDirectory, $"orders-{Rows switch
    {
        10_000 => "10k",
        100_000 => "100k",
        1_000_000 => "1m",
        _ => "2m",
    }}.txt");

    [IterationSetup]
    public void Reset() =>
        DatabaseReset.TruncateAsync(BenchmarkHost.ConnectionString).GetAwaiter().GetResult();

    [Benchmark]
    public async Task<long> ImportFile()
    {
        var completion = BenchmarkHost.Services.GetRequiredService<ImportCompletion>();
        var timeTicker = BenchmarkHost.Services.GetRequiredService<ITimeTickerManager<TimeTickerEntity>>();

        var task = completion.Track(FilePath);
        await timeTicker.AddAsync(new TimeTickerEntity
        {
            Function = "ImportFile",
            ExecutionTime = DateTime.UtcNow,
            Request = TickerHelper.CreateTickerRequest(FilePath),
        });
        return await task;
    }
}
