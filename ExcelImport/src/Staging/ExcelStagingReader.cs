using ExcelDataReader;
using System.Globalization;
using System.Runtime.CompilerServices;
using System.Text.Json;

namespace ExcelImport.Staging;

public sealed class ExcelStagingReader : IStagingReader
{
    public async IAsyncEnumerable<StagedRow> ReadRowsAsync(string path, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        using var stream = File.OpenRead(path);
        using var reader = ExcelReaderFactory.CreateReader(stream);

        if (!reader.Read())
        {
            throw new InvalidOperationException($"File '{Path.GetFileName(path)}' is empty.");
        }

        var headers = new string[reader.FieldCount];
        for (var i = 0; i < headers.Length; i++)
        {
            headers[i] = Convert.ToString(reader.GetValue(i), CultureInfo.InvariantCulture) ?? string.Empty;
        }

        var rowNumber = 1;
        while (reader.Read())
        {
            cancellationToken.ThrowIfCancellationRequested();

            var values = new Dictionary<string, string>(headers.Length);
            for (var i = 0; i < headers.Length; i++)
            {
                values[headers[i]] = i < reader.FieldCount
                    ? Convert.ToString(reader.GetValue(i), CultureInfo.InvariantCulture) ?? string.Empty
                    : string.Empty;
            }

            rowNumber++;
            var rawJson = JsonSerializer.Serialize(values, ImportJsonContext.Default.DictionaryStringString);
            yield return new StagedRow(rowNumber, rawJson);
        }

        await Task.CompletedTask;
    }
}
