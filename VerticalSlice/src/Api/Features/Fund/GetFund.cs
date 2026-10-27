using System.Text.Json;
using Api.Data;
using Api.ErrorHandling;
using CSharpFunctionalExtensions;
using Microsoft.EntityFrameworkCore;
using IResult = Microsoft.AspNetCore.Http.IResult;

namespace Api.Features.Fund;

public static class GetFund
{
    public record Response(
        Guid PublicId,
        string Name,
        Periodicity Periodicity,
        JsonElement? PermanentInformation
    );

    public static async Task<IResult> Handle(Guid publicId, AppDbContext db)
    {
        var result = Maybe<FundEntity>
            .From(await db.Funds.FirstOrDefaultAsync(f => f.PublicId == publicId))
            .ToResult(new NotFoundError())
            .Map(entity => new Response(
                entity.PublicId,
                entity.Name,
                entity.Periodicity,
                PermanentInformationJson.ToElement(entity.PermanentInformation)
            ));

        return result.Match(
            onSuccess: response => (IResult)Results.Ok(response),
            onFailure: error => error.ToHttpResult()
        );
    }
}
