namespace MailApi.Domain;

/// <summary>
/// A file attached to the mail (e.g. an xlsx report or export). Travels as a regular
/// MIME attachment — unlike <see cref="MailAsset"/>, it is not referenced from the HTML
/// body and shows up in the client's attachment list.
/// </summary>
public sealed record MailAttachment(
    string FileName,
    string ContentType,
    byte[] Content);
