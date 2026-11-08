namespace Api.Querying;

public record PagedResult<T>(IReadOnlyList<T> Data, int Count);
