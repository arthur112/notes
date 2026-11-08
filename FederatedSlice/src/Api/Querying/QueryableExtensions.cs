using System.Linq.Expressions;
using Gridify;
using Microsoft.EntityFrameworkCore;

namespace Api.Querying;

public static class QueryableExtensions
{
    private const int MaxPageSize = 100;
    private const int DefaultPageSize = 20;

    /// <summary>
    /// The only place that calls Gridify. Filters and orders the entities through
    /// <paramref name="mapper"/> (the field names the front may send → entity paths), counts,
    /// pages, then projects the page with <paramref name="select"/>.
    /// </summary>
    public static async Task<PagedResult<TResult>> ToPagedResultAsync<T, TResult>(
        this IQueryable<T> source,
        ListQuery query,
        IGridifyMapper<T> mapper,
        Expression<Func<T, TResult>> select,
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

        var filtered = source.ApplyFiltering(gridifyQuery, mapper);
        var count = await filtered.CountAsync(cancellationToken);
        var data = await filtered
            .ApplyOrderingAndPaging(gridifyQuery, mapper)
            .Select(select)
            .ToListAsync(cancellationToken);

        return new PagedResult<TResult>(data, count);
    }
}
