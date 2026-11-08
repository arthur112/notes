using Gridify;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Api.ErrorHandling;

internal sealed class GlobalExceptionHandler(
    IProblemDetailsService problemDetailsService,
    IHostEnvironment environment,
    ILogger<GlobalExceptionHandler> logger
) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken
    )
    {
        // A filter or orderBy naming a field the mapper doesn't know (or that doesn't parse) is the
        // client's mistake: 400 with Gridify's message, no stack trace.
        if (exception is GridifyMapperException or GridifyQueryException or GridifyFilteringException or GridifyOrderingException)
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            return await problemDetailsService.TryWriteAsync(
                new ProblemDetailsContext
                {
                    HttpContext = httpContext,
                    ProblemDetails = new ProblemDetails
                    {
                        Title = "Invalid filter or order",
                        Detail = exception.Message,
                    },
                }
            );
        }

        logger.LogError(
            exception,
            "Unhandled exception occurred: {Method} {Path}",
            httpContext.Request.Method,
            httpContext.Request.Path
        );

        httpContext.Response.StatusCode = exception switch
        {
            BadHttpRequestException badRequest => badRequest.StatusCode,
            _ => StatusCodes.Status500InternalServerError,
        };

        var exposeDetails = environment.IsDevelopment();

        return await problemDetailsService.TryWriteAsync(
            new ProblemDetailsContext
            {
                HttpContext = httpContext,
                ProblemDetails = new ProblemDetails
                {
                    Type = exposeDetails ? exception.GetType().Name : "about:blank",
                    Title = "An error occurred",
                    Detail = exposeDetails ? exception.ToString() : "An unexpected error occurred.",
                },
            }
        );
    }
}
