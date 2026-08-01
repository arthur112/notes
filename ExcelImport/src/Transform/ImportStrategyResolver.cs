namespace ExcelImport.Transform;

public class ImportStrategyResolver(IEnumerable<IImportStrategy> strategies)
{
    private readonly IReadOnlyDictionary<string, IImportStrategy> _strategies =
        strategies.ToDictionary(s => s.FileType, StringComparer.OrdinalIgnoreCase);

    public IImportStrategy Resolve(string fileType) =>
        _strategies.TryGetValue(fileType, out var strategy)
            ? strategy
            : throw new InvalidOperationException(
                $"No import strategy registered for file type '{fileType}'."
            );
}
