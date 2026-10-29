using System.ComponentModel.DataAnnotations;
using Api.Data;
using Api.ErrorHandling;
using Api.Validation;
using CSharpFunctionalExtensions;
using Microsoft.EntityFrameworkCore;
using IResult = Microsoft.AspNetCore.Http.IResult;

namespace Api.Features.SampleRecord;

public static class UpdateSampleRecord
{
    /// <summary>
    /// Full replacement: every column is written. <c>ExternalKey</c> is the business key and is
    /// not editable.
    /// </summary>
    public record Request(
        [property: ValidEnum] SampleRecordType Type,
        [property: Required(ErrorMessage = "'{0}' must not be empty."), MaxLength(50, ErrorMessage = "The length of '{0}' must be 50 characters or fewer.")]
        string CustId,
        int? Priority,
        [property: MaxLength(3, ErrorMessage = "The length of '{0}' must be 3 characters or fewer.")]
        string? Currency,
        int? PaymentTermDays,
        [property: MaxLength(50, ErrorMessage = "The length of '{0}' must be 50 characters or fewer.")]
        string? EdiCode,
        [property: MaxLength(100, ErrorMessage = "The length of '{0}' must be 100 characters or fewer.")]
        string? EdiPartner,
        string? Description,
        [property: MaxLength(100, ErrorMessage = "The length of '{0}' must be 100 characters or fewer.")]
        string? Reference,
        decimal Amount,
        decimal? Quantity,
        DateOnly OrderDate,
        DateOnly? DueDate
    );

    public static async Task<IResult> Handle(
        Guid publicId,
        Request request,
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
            .ToResult<SampleRecordEntity, IHttpError>(new NotFoundError())
            .Tap(entity =>
            {
                var original = SampleRecordWrite.Snapshot(db, entity);
                entity.MapFrom(request);
                return SampleRecordWrite.ApplyRulesAsync(db, entity, original, cancellationToken);
            })
            .Tap(_ => db.SaveChangesAsync(cancellationToken))
            .Map(entity => entity.ToResponse());

        return result.Match(
            onSuccess: response => (IResult)Results.Ok(response),
            onFailure: error => error.ToHttpResult()
        );
    }
}
