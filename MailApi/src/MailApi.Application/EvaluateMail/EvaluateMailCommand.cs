namespace MailApi.Application.EvaluateMail;

public sealed record EvaluateMailCommand(
    string Template,
    IReadOnlyDictionary<string, object?> Data);
