using System.Text.Json;
using Api.Data;
using Api.Querying;
using Microsoft.AspNetCore.Mvc;

namespace Api.Features.Fund;

public static class ListFunds
{
    public record Response(
        Guid PublicId,
        string Name,
        Periodicity Periodicity,
        JsonElement? PermanentInformation
    );

    public static async Task<IResult> Handle(
        [AsParameters] ListQuery query,
        AppDbContext db,
        CancellationToken cancellationToken
    )
    {
        var result = await db
            .Funds.OrderBy(f => f.Id)
            .ToPagedResultAsync(query, cancellationToken: cancellationToken);

        return Results.Ok(
            result.Select(f => new Response(
                f.PublicId,
                f.Name,
                f.Periodicity,
                PermanentInformationJson.ToElement(f.PermanentInformation)
            ))
        );
    }
}
