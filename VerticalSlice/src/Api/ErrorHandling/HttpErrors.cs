using IResult = Microsoft.AspNetCore.Http.IResult;

namespace Api.ErrorHandling;

public interface IHttpError
{
    IResult ToHttpResult();
}

// Every domain error renders as an RFC 9457 problem+json document (type/title/status from the
// status code, plus the error's own detail), so clients parse one failure shape. ValidationError
// keeps Results.ValidationProblem, which is the same media type with the per-field `errors`
// dictionary added. Status codes are unchanged by these bodies.
public record NotFoundError : IHttpError
{
    public IResult ToHttpResult() => Results.Problem(statusCode: StatusCodes.Status404NotFound);
}

public record ConflictError : IHttpError
{
    public IResult ToHttpResult() => Results.Problem(statusCode: StatusCodes.Status409Conflict);
}

public record BadRequestError(string Message) : IHttpError
{
    public IResult ToHttpResult() =>
        Results.Problem(detail: Message, statusCode: StatusCodes.Status400BadRequest);
}

public record ValidationError(string Field, string Message) : IHttpError
{
    public IResult ToHttpResult() =>
        Results.ValidationProblem(new Dictionary<string, string[]> { [Field] = [Message] });
}
