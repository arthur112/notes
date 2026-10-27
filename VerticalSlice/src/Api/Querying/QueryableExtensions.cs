using Gridify;
using Gridify.EntityFramework;

namespace Api.Querying;

public static class QueryableExtensions
{
    private const int MaxPageSize = 100;
    private const int DefaultPageSize = 20;

    public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
        this IQueryable<T> source,
        ListQuery query,
        IGridifyMapper<T>? mapper = null,
        CancellationToken cancellationToken = default
    )
    {
        var gridifyQuery = new GridifyQuery
        {
            Page = Math.Max(query.Page ?? 1, 1),
            PageSize = Math.Clamp(query.PageSize ?? DefaultPageSize, 1, MaxPageSize),
            Filter = string.IsNullOrWhiteSpace(query.Filter) ? null : query.Filter,
            OrderBy = string.IsNullOrWhiteSpace(query.OrderBy) ? null : query.OrderBy,
        };

        var paging = await source.GridifyAsync(gridifyQuery, cancellationToken, mapper);

        return new PagedResult<T>([.. paging.Data], paging.Count);
    }
}
