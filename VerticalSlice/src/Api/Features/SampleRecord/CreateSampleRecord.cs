using System.ComponentModel.DataAnnotations;
using Api.Data;
using Api.ErrorHandling;
using Api.Validation;
using CSharpFunctionalExtensions;
using IResult = Microsoft.AspNetCore.Http.IResult;

namespace Api.Features.SampleRecord;

public static class CreateSampleRecord
{
    public record Request(
        [property: Required(ErrorMessage = "'{0}' must not be empty."), MaxLength(100, ErrorMessage = "The length of '{0}' must be 100 characters or fewer.")]
        string ExternalKey,
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
        Request request,
        AppDbContext db,
        CancellationToken cancellationToken
    )
    {
        var result = await Result
            .Success<Request, IHttpError>(request)
            .Map(req =>
            {
                var entity = new SampleRecordEntity();
                entity.MapFrom(req);
                return entity;
            })
            .Tap(entity => SampleRecordWrite.ApplyRulesAsync(db, entity, null, cancellationToken))
            .Tap(entity => db.SampleRecords.Add(entity))
            .Tap(_ => db.SaveChangesAsync(cancellationToken))
            .Map(entity => entity.ToResponse());

        return result.Match(
            onSuccess: response =>
                (IResult)Results.Created($"/api/sample-records/{response.PublicId}", response),
            onFailure: error => error.ToHttpResult()
        );
    }
}
