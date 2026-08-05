using System.Collections.Concurrent;

namespace Parallelism.Jobs;

public sealed class ImportCompletion
{
    private readonly ConcurrentDictionary<string, TaskCompletionSource<long>> _pending = new(StringComparer.OrdinalIgnoreCase);

    public Task<long> Track(string filePath)
    {
        var tcs = new TaskCompletionSource<long>(TaskCreationOptions.RunContinuationsAsynchronously);
        _pending[filePath] = tcs;
        return tcs.Task;
    }

    public void Complete(string filePath, long rows)
    {
        if (_pending.TryRemove(filePath, out var tcs))
        {
            tcs.TrySetResult(rows);
        }
    }

    public void Fail(string filePath, Exception exception)
    {
        if (_pending.TryRemove(filePath, out var tcs))
        {
            tcs.TrySetException(exception);
        }
    }
}
