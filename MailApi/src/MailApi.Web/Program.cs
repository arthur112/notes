using MailApi.Application.EvaluateMail;
using MailApi.Application.SendMail;
using MailApi.Infrastructure;
using MailApi.Web.Configuration;
using MailApi.Web.Contracts;
using MailApi.Web.Mapping;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using FunctionalResult = CSharpFunctionalExtensions.Result;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<MailApiOptions>(builder.Configuration.GetSection(MailApiOptions.SectionName));
builder.Services.AddMailInfrastructure(builder.Configuration);
builder.Services.AddScoped<SendMailHandler>();
builder.Services.AddScoped<EvaluateMailHandler>();

var mailApiOptions = builder.Configuration
    .GetSection(MailApiOptions.SectionName)
    .Get<MailApiOptions>() ?? new MailApiOptions();
var isApiKeyConfigured = mailApiOptions.IsAuthEnabled;

builder.Services.AddOpenApi(options =>
{
    if (!isApiKeyConfigured)
        return;

    // Advertise the X-Api-Key header so consumers (Scalar) can set it once.
    options.AddDocumentTransformer((document, _, _) =>
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes["ApiKey"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.ApiKey,
            In = ParameterLocation.Header,
            Name = "X-Api-Key",
            Description = "Shared secret configured per application under MailApi:Applications.",
        };
        document.Security =
        [
            new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference("ApiKey", document)] = [],
            },
        ];
        return Task.CompletedTask;
    });
});

var app = builder.Build();

app.MapOpenApi();
app.MapScalarApiReference();

app.MapPost("/api/mail/send", async (
    SendMailRequest request,
    HttpContext httpContext,
    IOptions<MailApiOptions> apiOptions,
    SendMailHandler handler,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    if (!apiOptions.Value.IsAuthorized(GetApiKey(httpContext)))
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
})
.WithName("SendMail")
.WithSummary("Renders the named template and sends it via SMTP.")
.Produces(StatusCodes.Status200OK);

app.MapPost("/api/mail/evaluate", async (
    EvaluateMailRequest request,
    HttpContext httpContext,
    IOptions<MailApiOptions> apiOptions,
    EvaluateMailHandler handler,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    if (!apiOptions.Value.IsAuthorized(GetApiKey(httpContext)))
        return Results.Unauthorized();

    var dataResult = JsonTemplateDataConverter.ToLiquidModel(request.Data);
    if (dataResult.IsFailure)
        return ToHttpResult(FunctionalResult.Failure<string, MailError>(dataResult.Error), logger);

    var result = await handler.HandleAsync(
        new EvaluateMailCommand(request.Template, dataResult.Value),
        cancellationToken);

    return result.IsSuccess
        ? Results.Content(result.Value, "text/html")
        : ToHttpResult(result, logger);
})
.WithName("EvaluateMail")
.WithSummary("Renders the named template and returns the resulting HTML without sending it.");

app.Run();

static string? GetApiKey(HttpContext httpContext) =>
    httpContext.Request.Headers.TryGetValue("X-Api-Key", out var apiKey) ? apiKey.ToString() : null;

static IResult ToHttpResult(
    CSharpFunctionalExtensions.Result<string, MailError> result,
    ILogger logger)
{
    if (result.IsSuccess)
        return Results.Ok(new { messageId = result.Value });

    var error = result.Error;
    return error.Type switch
    {
        MailErrorType.Validation =>
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
