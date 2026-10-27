namespace Api.Querying;

public record PagedResult<T>(IReadOnlyList<T> Data, int Count)
{
    public PagedResult<TResult> Select<TResult>(Func<T, TResult> selector) =>
        new([.. Data.Select(selector)], Count);
}
