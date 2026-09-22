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
        if (!MailTemplateExtensions.TryParse(command.Template, out var template))
            return Result.Failure<string, MailError>(
                MailError.Validation($"'template' must be one of: {string.Join(", ", Enum.GetNames<MailTemplate>())}."));

        if (command.To is null || command.To.Count == 0 || command.To.Any(string.IsNullOrWhiteSpace))
            return Result.Failure<string, MailError>(
                MailError.Validation("At least one non-empty 'to' recipient is required."));

        if (command.Cc?.Any(string.IsNullOrWhiteSpace) == true)
            return Result.Failure<string, MailError>(
                MailError.Validation("'cc' recipients cannot be empty."));

        var rendered = await templateRenderer.RenderAsync(template, command.Data, cancellationToken);
        if (rendered.IsFailure)
            return Result.Failure<string, MailError>(rendered.Error);

        var subject = (string.IsNullOrWhiteSpace(command.Subject)
            ? template.DefaultSubject()
            : command.Subject).Trim();

        if (subject.Contains('\r') || subject.Contains('\n'))
            return Result.Failure<string, MailError>(
                MailError.Validation("The subject cannot contain a line break."));

        var email = new OutboundEmail(
            command.To,
            command.Cc ?? [],
            subject,
            rendered.Value.Html,
            rendered.Value.InlineImages);
        return await emailSender.SendAsync(email, cancellationToken);
    }
}
