namespace Parallelism.Benchmarks;

public static class BenchmarkHost
{
    public static IServiceProvider Services { get; set; } = null!;
    public static string ConnectionString { get; set; } = null!;
}
