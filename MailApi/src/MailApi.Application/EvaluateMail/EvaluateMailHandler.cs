using CSharpFunctionalExtensions;
using MailApi.Application.Abstractions;
using MailApi.Application.SendMail;
using MailApi.Domain;

namespace MailApi.Application.EvaluateMail;

/// <summary>
/// Renders a template without delivering it — the dry-run counterpart of
/// <see cref="SendMail.SendMailHandler"/>, used by the /api/mail/evaluate endpoint.
/// </summary>
public sealed class EvaluateMailHandler(ITemplateRenderer templateRenderer)
{
    public async Task<Result<string, MailError>> HandleAsync(
        EvaluateMailCommand command,
        CancellationToken cancellationToken)
    {
        if (!MailTemplateExtensions.TryParse(command.Template, out var template))
            return Result.Failure<string, MailError>(
                MailError.Validation($"'template' must be one of: {string.Join(", ", Enum.GetNames<MailTemplate>())}."));

        return await templateRenderer.RenderAsync(template, command.Data, cancellationToken);
    }
}
