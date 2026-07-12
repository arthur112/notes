using CSharpFunctionalExtensions;
using MailApi.Application.Abstractions;
using MailApi.Domain;

namespace MailApi.Application.SendMail;

public sealed class SendMailHandler(ITemplateRenderer templateRenderer, IEmailSender emailSender)
{
    public async Task<Result<string, MailError>> HandleAsync(
        SendMailCommand command,
        CancellationToken cancellationToken)
    {
        if (!TemplateKey.TryCreate(command.Template, out var templateKey))
            return Result.Failure<string, MailError>(
                MailError.Validation("'template' must only contain letters, digits, '-' or '_'."));

        if (command.To is null || command.To.Count == 0 || command.To.Any(string.IsNullOrWhiteSpace))
            return Result.Failure<string, MailError>(
                MailError.Validation("At least one non-empty 'to' recipient is required."));

        if (command.Cc?.Any(string.IsNullOrWhiteSpace) == true)
            return Result.Failure<string, MailError>(
                MailError.Validation("'cc' recipients cannot be empty."));

        var renderedResult = await templateRenderer.RenderAsync(templateKey!, command.Data, cancellationToken);
        if (renderedResult.IsFailure)
            return Result.Failure<string, MailError>(renderedResult.Error);

        var rendered = renderedResult.Value;
        var subject = (string.IsNullOrWhiteSpace(command.Subject)
            ? rendered.Subject ?? "(no subject)"
            : command.Subject).Trim();

        if (subject.Contains('\r') || subject.Contains('\n'))
            return Result.Failure<string, MailError>(
                MailError.Validation("The subject cannot contain a line break."));

        var email = new OutboundEmail(command.To, command.Cc ?? [], subject, rendered.Html, rendered.Text);
        return await emailSender.SendAsync(email, cancellationToken);
    }
}
