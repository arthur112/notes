namespace MailApi.Application.SendMail;

using MailApi.Domain;

public sealed record SendMailCommand(
    string Template,
    IReadOnlyCollection<string>? To,
    IReadOnlyCollection<string>? Cc,
    string? Subject,
    IReadOnlyDictionary<string, object?> Data,
    IReadOnlyCollection<MailAttachment>? Attachments = null);
