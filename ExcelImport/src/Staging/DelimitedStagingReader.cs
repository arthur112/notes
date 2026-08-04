using nietras.SeparatedValues;
using System.Buffers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;

namespace ExcelImport.Staging;

public sealed class DelimitedStagingReader : IStagingReader
{
    private static readonly SepReaderOptions Options = Sep.New(',').Reader();

    public async IAsyncEnumerable<StagedRow> ReadRowsAsync(string path, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read,
            bufferSize: 1 << 16, options: FileOptions.SequentialScan | FileOptions.Asynchronous);
        using var textReader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        using var reader = Options.From(textReader);

        var header = reader.Header;
        if (header.IsEmpty)
        {
            throw new InvalidOperationException($"File '{Path.GetFileName(path)}' has no header row.");
        }

        var colNames = header.ColNames;
        var encodedNames = new JsonEncodedText[colNames.Count];
        for (var i = 0; i < encodedNames.Length; i++)
        {
            encodedNames[i] = JsonEncodedText.Encode(colNames[i], JavaScriptEncoder.Default);
        }

        var buffer = new ArrayBufferWriter<byte>(256);
        var rowNumber = 1;
        foreach (var row in reader)
        {
            cancellationToken.ThrowIfCancellationRequested();
            buffer.Clear();
            using (var writer = new Utf8JsonWriter(buffer))
            {
                writer.WriteStartObject();
                var count = Math.Min(encodedNames.Length, row.ColCount);
                for (var i = 0; i < count; i++)
                {
                    writer.WriteString(encodedNames[i], row[i].Span);
                }
                for (var i = count; i < encodedNames.Length; i++)
                {
                    writer.WriteString(encodedNames[i], ReadOnlySpan<char>.Empty);
                }
                writer.WriteEndObject();
            }

            rowNumber++;
            yield return new StagedRow(rowNumber, Encoding.UTF8.GetString(buffer.WrittenSpan));
        }
    }
}
