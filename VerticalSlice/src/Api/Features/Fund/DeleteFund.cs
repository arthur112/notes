using Api.Data;
using Api.ErrorHandling;
using CSharpFunctionalExtensions;
using Microsoft.EntityFrameworkCore;
using IResult = Microsoft.AspNetCore.Http.IResult;

namespace Api.Features.Fund;

public static class DeleteFund
{
    public static async Task<IResult> Handle(Guid publicId, AppDbContext db)
    {
        var result = await Maybe<FundEntity>
            .From(await db.Funds.FirstOrDefaultAsync(f => f.PublicId == publicId))
            .ToResult(new NotFoundError())
            .Tap(entity => db.Funds.Remove(entity))
            .Tap(_ => db.SaveChangesAsync());

        return result.Match(
            onSuccess: _ => (IResult)Results.NoContent(),
            onFailure: error => error.ToHttpResult()
        );
    }
}
