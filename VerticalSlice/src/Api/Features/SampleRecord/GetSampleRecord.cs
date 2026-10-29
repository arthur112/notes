using Api.Data;
using Api.ErrorHandling;
using CSharpFunctionalExtensions;
using Microsoft.EntityFrameworkCore;
using IResult = Microsoft.AspNetCore.Http.IResult;

namespace Api.Features.SampleRecord;

public static class GetSampleRecord
{
    public static async Task<IResult> Handle(
        Guid publicId,
        AppDbContext db,
        CancellationToken cancellationToken
    )
    {
        var result = Maybe<SampleRecordEntity>
            .From(
                await db.SampleRecords.FirstOrDefaultAsync(
                    r => r.PublicId == publicId,
                    cancellationToken
                )
            )
            .ToResult(new NotFoundError())
            .Map(entity => entity.ToResponse());

        return result.Match(
            onSuccess: response => (IResult)Results.Ok(response),
            onFailure: error => error.ToHttpResult()
        );
    }
}
