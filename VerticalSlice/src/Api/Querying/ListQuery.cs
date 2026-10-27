namespace Api.Querying;

public record ListQuery
{
    public int? Page { get; init; }
    public int? PageSize { get; init; }
    public string? Filter { get; init; }
    public string? OrderBy { get; init; }
}
