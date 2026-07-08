using System.Text.RegularExpressions;
using MailApi;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(SmtpOptions.SectionName));
builder.Services.Configure<MailApiOptions>(builder.Configuration.GetSection(MailApiOptions.SectionName));
builder.Services.AddSingleton<TemplateRenderer>();

var app = builder.Build();

// Only alphanumerics, dash and underscore so a crafted key like "../x" can't escape templates/.
var templateKeyPattern = new Regex(@"^[A-Za-z0-9_-]+$", RegexOptions.Compiled);

app.MapPost("/api/mail/send", async (
    SendMailRequest req,
    HttpContext http,
    IOptions<MailApiOptions> apiOptions,
    IOptions<SmtpOptions> smtpOptions,
    TemplateRenderer renderer,
    CancellationToken ct) =>
{
    var apiOpts = apiOptions.Value;

    if (!string.IsNullOrEmpty(apiOpts.ApiKey) &&
        (!http.Request.Headers.TryGetValue("X-Api-Key", out var key) || key != apiOpts.ApiKey))
        return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(req.Template) || req.To is null || req.To.Count == 0)
        return Results.BadRequest(new { error = "'template' and at least one 'to' recipient are required." });

    if (!templateKeyPattern.IsMatch(req.Template))
        return Results.BadRequest(new { error = "'template' must only contain letters, digits, '-' or '_'." });

    string templatesPath = Path.IsPathRooted(apiOpts.TemplatesPath)
        ? apiOpts.TemplatesPath
        : Path.Combine(app.Environment.ContentRootPath, apiOpts.TemplatesPath);

    string bodyPath = Path.Combine(templatesPath, req.Template + ".liquid");
    if (!File.Exists(bodyPath))
        return Results.BadRequest(new { error = $"Unknown template '{req.Template}'." });

    var model = DataConverter.ToLiquidModel(req.Data);

    try
    {
        var html = await renderer.RenderAsync(bodyPath, model, ct);

        string subject = !string.IsNullOrWhiteSpace(req.Subject)
            ? req.Subject!
            : await TryRenderCompanion(templatesPath, req.Template, "subject", model, renderer, ct)
              ?? "(no subject)";

        string? text = await TryRenderCompanion(templatesPath, req.Template, "text", model, renderer, ct);

        var smtp = smtpOptions.Value;
        var message = new MimeMessage
        {
            From = { new MailboxAddress(smtp.From.Name, smtp.From.Address) },
            Subject = subject,
        };
        foreach (var to in req.To) message.To.Add(MailboxAddress.Parse(to));
        if (req.Cc is not null)
            foreach (var cc in req.Cc) message.Cc.Add(MailboxAddress.Parse(cc));

        var bodyBuilder = new BodyBuilder { HtmlBody = html };
        if (text is not null) bodyBuilder.TextBody = text;
        message.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(smtp.Host, smtp.Port, smtp.UseSsl ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.None, ct);
        if (!string.IsNullOrEmpty(smtp.Username))
            await client.AuthenticateAsync(smtp.Username, smtp.Password ?? "", ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);

        return Results.Ok(new { messageId = message.MessageId });
    }
    catch (InvalidOperationException ex) // Liquid parse/render error
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    catch (SmtpCommandException ex)
    {
        return Results.Json(new { error = $"SMTP error: {ex.Message}" }, statusCode: StatusCodes.Status502BadGateway);
    }
    catch (IOException ex)
    {
        return Results.Json(new { error = $"SMTP connection failed: {ex.Message}" }, statusCode: StatusCodes.Status502BadGateway);
    }
});

app.Run();

static async Task<string?> TryRenderCompanion(
    string templatesPath, string template, string kind,
    object model, TemplateRenderer renderer, CancellationToken ct)
{
    string path = Path.Combine(templatesPath, $"{template}.{kind}.liquid");
    return File.Exists(path) ? await renderer.RenderAsync(path, model, ct) : null;
}
