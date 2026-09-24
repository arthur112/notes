using FluentValidation;

namespace MailApi.Web.Validation;

/// <summary>
/// Runs FluentValidation right after model binding, before the endpoint handler —
/// the minimal-API equivalent of MVC's automatic model validation.
/// </summary>
public sealed class ValidationFilter<T>(IValidator<T> validator) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next)
    {
        var model = context.Arguments.OfType<T>().FirstOrDefault();
        if (model is not null)
        {
            var result = await validator.ValidateAsync(model);
            if (!result.IsValid)
                return Results.BadRequest(new
                {
                    error = string.Join(" ", result.Errors.Select(e => e.ErrorMessage)),
                });
        }

        return await next(context);
    }
}
