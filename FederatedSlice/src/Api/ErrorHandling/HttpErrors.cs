using IResult = Microsoft.AspNetCore.Http.IResult;

namespace Api.ErrorHandling;

public interface IHttpError
{
    IResult ToHttpResult();
}

// Every domain error renders as an RFC 9457 problem+json document, so the front parses one
// failure shape (web/src/shared/lib/problem.ts). ValidationError keeps Results.ValidationProblem:
// the same media type plus the per-field `errors` the order form puts on its fields.
public record NotFoundError : IHttpError
{
    public IResult ToHttpResult() => Results.Problem(statusCode: StatusCodes.Status404NotFound);
}

/// <summary>One or more field errors, keyed by the form's field path (<c>dueDate</c>, <c>lines[0].quantity</c>).</summary>
public record ValidationError(Dictionary<string, string[]> Errors) : IHttpError
{
    public ValidationError(string field, string message)
        : this(new Dictionary<string, string[]> { [field] = [message] }) { }

    public IResult ToHttpResult() => Results.ValidationProblem(Errors);
}
