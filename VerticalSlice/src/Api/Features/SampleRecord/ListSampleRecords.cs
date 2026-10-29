using Api.Data;
using Api.Querying;
using Microsoft.AspNetCore.Mvc;

namespace Api.Features.SampleRecord;

public static class ListSampleRecords
{
    public static async Task<IResult> Handle(
        [AsParameters] ListQuery query,
        AppDbContext db,
        CancellationToken cancellationToken
    )
    {
        var result = await db
            .SampleRecords.OrderBy(r => r.Id)
            .ToPagedResultAsync(query, cancellationToken: cancellationToken);

        return Results.Ok(result.Select(r => r.ToResponse()));
    }
}
