namespace MailApi.Domain;

public sealed record OutboundEmail(
    IReadOnlyCollection<string> To,
    IReadOnlyCollection<string> Cc,
    string Subject,
    string HtmlBody,
    IReadOnlyList<MailAsset> InlineImages);
