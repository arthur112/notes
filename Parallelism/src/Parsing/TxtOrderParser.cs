using nietras.SeparatedValues;
using System.Runtime.CompilerServices;
using System.Text;

namespace Parallelism.Parsing;

public sealed class TxtOrderParser : IRowParser
{
    public const int ColumnCount = 28;

    private static readonly SepReaderOptions Options = Sep.New(',').Reader();

    public string Extension => "txt";

    public async IAsyncEnumerable<string[]> ReadRowsAsync(string path, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read,
            bufferSize: 1 << 16, options: FileOptions.SequentialScan | FileOptions.Asynchronous);
        using var textReader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        using var reader = Options.From(textReader);

        if (reader.Header.IsEmpty)
        {
            throw new InvalidOperationException($"File '{Path.GetFileName(path)}' has no header row.");
        }
        if (reader.Header.ColNames.Count != ColumnCount)
        {
            throw new InvalidOperationException(
                $"File '{Path.GetFileName(path)}' has {reader.Header.ColNames.Count} columns, expected {ColumnCount}.");
        }

        foreach (var row in reader)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var values = new string[ColumnCount];
            for (var i = 0; i < ColumnCount; i++)
            {
                values[i] = i < row.ColCount ? row[i].ToString() : string.Empty;
            }
            yield return values;
        }
    }
}
