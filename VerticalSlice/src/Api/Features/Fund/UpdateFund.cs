using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Api.Data;
using Api.ErrorHandling;
using Api.Validation;
using CSharpFunctionalExtensions;
using Microsoft.EntityFrameworkCore;
using IResult = Microsoft.AspNetCore.Http.IResult;

namespace Api.Features.Fund;

public static class UpdateFund
{
    /// <summary>
    /// PUT stays patch-like: every field is optional and only the fields present in the body are
    /// written, so the frontend's single-purpose permanentInformation save does not clobber the
    /// stored name/periodicity. The frontend keeps owning the
    /// permanentInformation.legalName -> name derivation (it does that in the mock today) and
    /// must send name in the same PUT when the header name should follow.
    /// </summary>
    public record Request(
        [property: MaxLength(
            200,
            ErrorMessage = "The length of '{0}' must be 200 characters or fewer."
        )]
            string? Name = null,
        [property: JsonObject] JsonElement? PermanentInformation = null,
        [property: ValidEnum] Periodicity? Periodicity = null
    ) : IValidatableObject
    {
        /// <summary>
        /// Name is optional, so its non-empty rule cannot use <see cref="NotEmptyStringAttribute"/>,
        /// which also rejects an omitted (null) field.
        /// </summary>
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (Name is not null && string.IsNullOrWhiteSpace(Name))
                yield return new ValidationResult("'Name' must not be empty.", [nameof(Name)]);
        }
    }

    public record Response(
        Guid PublicId,
        string Name,
        Periodicity Periodicity,
        JsonElement? PermanentInformation
    );

    public static async Task<IResult> Handle(Guid publicId, Request request, AppDbContext db)
    {
        var result = await Maybe<FundEntity>
            .From(await db.Funds.FirstOrDefaultAsync(f => f.PublicId == publicId))
            .ToResult(new NotFoundError())
            .Tap(entity =>
            {
                if (request.Name is { } name)
                    entity.Name = name;
                if (request.Periodicity is { } periodicity)
                    entity.Periodicity = periodicity;
                if (request.PermanentInformation is { } permanentInformation)
                    entity.PermanentInformation = permanentInformation.GetRawText();
            })
            .Tap(_ => db.SaveChangesAsync())
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
