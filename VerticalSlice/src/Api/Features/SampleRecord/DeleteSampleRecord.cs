using Api.Data;
using Api.ErrorHandling;
using CSharpFunctionalExtensions;
using Microsoft.EntityFrameworkCore;
using IResult = Microsoft.AspNetCore.Http.IResult;

namespace Api.Features.SampleRecord;

public static class DeleteSampleRecord
{
    public static async Task<IResult> Handle(
        Guid publicId,
        AppDbContext db,
        CancellationToken cancellationToken
    )
    {
        var result = await Maybe<SampleRecordEntity>
            .From(
                await db.SampleRecords.FirstOrDefaultAsync(
                    r => r.PublicId == publicId,
                    cancellationToken
                )
            )
            .ToResult(new NotFoundError())
            .Tap(entity => db.SampleRecords.Remove(entity))
            .Tap(_ => db.SaveChangesAsync(cancellationToken));

        return result.Match(
            onSuccess: _ => (IResult)Results.NoContent(),
            onFailure: error => error.ToHttpResult()
        );
    }
}
