using System.ComponentModel.DataAnnotations;
using Api.Data;
using Api.ErrorHandling;
using Api.Validation;
using CSharpFunctionalExtensions;
using IResult = Microsoft.AspNetCore.Http.IResult;

namespace Api.Features.Fund;

public static class CreateFund
{
    public record Request(
        [property: Required(ErrorMessage = "'{0}' must not be empty."), MaxLength(200, ErrorMessage = "The length of '{0}' must be 200 characters or fewer.")]
        string Name,
        string? PermanentInformation = null,
        [property: ValidEnum]
        Periodicity Periodicity = Periodicity.Quarterly
    );

    public record Response(
        Guid PublicId,
        string Name,
        Periodicity Periodicity,
        string? PermanentInformation
    );

    public static async Task<IResult> Handle(Request request, AppDbContext db)
    {
        var result = await Result
            .Success<Request, IHttpError>(request)
            .Map(req => new FundEntity
            {
                Name = req.Name,
                PermanentInformation = req.PermanentInformation,
                Periodicity = req.Periodicity,
            })
            .Tap(entity => db.Funds.Add(entity))
            .Tap(_ => db.SaveChangesAsync())
            .Map(entity => new Response(
                entity.PublicId,
                entity.Name,
                entity.Periodicity,
                entity.PermanentInformation
            ));

        return result.Match(
            onSuccess: response =>
                (IResult)Results.Created($"/api/funds/{response.PublicId}", response),
            onFailure: error => error.ToHttpResult()
        );
    }
}
