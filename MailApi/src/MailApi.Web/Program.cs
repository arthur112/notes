using MailApi.Application.SendMail;
using MailApi.Infrastructure;
using MailApi.Web.Configuration;
using MailApi.Web.Contracts;
using MailApi.Web.Mapping;
using Microsoft.Extensions.Options;
using FunctionalResult = CSharpFunctionalExtensions.Result;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<MailApiOptions>(builder.Configuration.GetSection(MailApiOptions.SectionName));
builder.Services.AddMailInfrastructure(builder.Configuration);
builder.Services.AddScoped<SendMailHandler>();

var app = builder.Build();

app.MapPost("/api/mail/send", async (
    SendMailRequest request,
    HttpContext httpContext,
    IOptions<MailApiOptions> apiOptions,
    SendMailHandler handler,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    if (!string.IsNullOrEmpty(apiOptions.Value.ApiKey) &&
        (!httpContext.Request.Headers.TryGetValue("X-Api-Key", out var apiKey) || apiKey != apiOptions.Value.ApiKey))
        return Results.Unauthorized();

    var dataResult = JsonTemplateDataConverter.ToLiquidModel(request.Data);
    if (dataResult.IsFailure)
        return ToHttpResult(FunctionalResult.Failure<string, MailError>(dataResult.Error), logger);

    var result = await handler.HandleAsync(
        new SendMailCommand(
            request.Template,
            request.To,
            request.Cc,
            request.Subject,
            dataResult.Value),
        cancellationToken);

    return ToHttpResult(result, logger);
});

app.Run();

static IResult ToHttpResult(
    CSharpFunctionalExtensions.Result<string, MailError> result,
    ILogger logger)
{
    if (result.IsSuccess)
        return Results.Ok(new { messageId = result.Value });

    var error = result.Error;
    return error.Type switch
    {
        MailErrorType.Validation or MailErrorType.TemplateNotFound =>
            Results.BadRequest(new { error = error.Message }),
        MailErrorType.TemplateInvalid => LogAndReturn(
            logger,
            error,
            "Template rendering failed",
            Results.Json(new { error = "The template is invalid." }, statusCode: StatusCodes.Status500InternalServerError)),
        MailErrorType.TemplateUnavailable => LogAndReturn(
            logger,
            error,
            "Template access failed",
            Results.Json(new { error = "The template is unavailable." }, statusCode: StatusCodes.Status500InternalServerError)),
        MailErrorType.Delivery => LogAndReturn(
            logger,
            error,
            "SMTP delivery failed",
            Results.Json(new { error = error.Message }, statusCode: StatusCodes.Status502BadGateway)),
        _ => Results.StatusCode(StatusCodes.Status500InternalServerError),
    };
}

static IResult LogAndReturn(ILogger logger, MailError error, string message, IResult result)
{
    logger.LogError(error.Exception, "{Message}", message);
    return result;
}

public partial class Program;
