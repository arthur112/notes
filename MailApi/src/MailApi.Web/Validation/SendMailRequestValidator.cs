using System.Buffers.Text;
using FluentValidation;
using MailApi.Web.Contracts;

namespace MailApi.Web.Validation;

/// <summary>
/// Validates attachments at model-binding time (via <see cref="ValidationFilter{T}"/>), before
/// the send use case runs. Attachments are base64 in the JSON payload — keep them small (DESIGN.md).
/// </summary>
public sealed class SendMailRequestValidator : AbstractValidator<SendMailRequest>
{
    /// <summary>Total decoded attachment size allowed per mail.</summary>
    private const long MaxTotalAttachmentBytes = 10L * 1024 * 1024;

    public SendMailRequestValidator()
    {
        RuleForEach(request => request.Attachments)
            .Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("Attachments cannot be null.")
            .ChildRules(attachment =>
            {
                attachment.RuleFor(x => x.FileName)
                    .NotEmpty().WithMessage("Every attachment requires a non-empty file name.");

                attachment.RuleFor(x => x.Content)
                    .NotEmpty().WithMessage("Attachments cannot be empty.")
                    .Must(content => Base64.IsValid(content))
                    .WithMessage(x => $"Attachment '{x.FileName}' has invalid base64 content.");
            });

        RuleFor(request => request.Attachments)
            .Must(WithinTotalSizeLimit)
            .WithMessage($"Attachments exceed the total size limit of {MaxTotalAttachmentBytes / (1024 * 1024)} MB.")
            .When(request => request.Attachments is { Count: > 0 });
    }

    // Valid base64 decodes to ~3/4 of its length, so the limit is enforced without decoding.
    private static bool WithinTotalSizeLimit(List<MailAttachmentRequest>? attachments) =>
        attachments is null ||
        attachments.Where(a => a is not null).Sum(a => (long)a.Content.Length * 3 / 4) <= MaxTotalAttachmentBytes;
}
