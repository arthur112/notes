namespace MailApi.Application.SendMail;

public sealed record SendMailCommand(
    string Template,
    IReadOnlyCollection<string>? To,
    IReadOnlyCollection<string>? Cc,
    string? Subject,
    IReadOnlyDictionary<string, object?> Data);
