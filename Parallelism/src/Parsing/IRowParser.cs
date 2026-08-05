namespace Parallelism.Parsing;

public interface IRowParser
{
    string Extension { get; }
    IAsyncEnumerable<string[]> ReadRowsAsync(string path, CancellationToken cancellationToken);
}
