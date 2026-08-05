namespace Parallelism.Parsing;

public sealed class RowParserResolver(IEnumerable<IRowParser> parsers)
{
    private readonly Dictionary<string, IRowParser> _byExtension =
        parsers.ToDictionary(p => p.Extension, StringComparer.OrdinalIgnoreCase);

    public IRowParser Resolve(string path)
    {
        var extension = Path.GetExtension(path).TrimStart('.');
        if (_byExtension.TryGetValue(extension, out var parser))
        {
            return parser;
        }
        throw new NotSupportedException(
            $"No row parser registered for '.{extension}'. Supported: {string.Join(", ", _byExtension.Keys.Select(k => "." + k))}");
    }
}
