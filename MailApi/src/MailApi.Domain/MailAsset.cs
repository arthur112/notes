namespace MailApi.Domain;

/// <summary>
/// A binary asset (typically an image) that travels *inside* the MIME message and is
/// referenced from the HTML body as <c>cid:{ContentId}</c>.
/// <para>
/// Attaching is what makes an image display reliably: most clients block remote images
/// by default, and Gmail/Outlook strip <c>data:</c> URIs, but a linked resource in a
/// <c>multipart/related</c> body always renders.
/// </para>
/// </summary>
public sealed record MailAsset(
    string ContentId,
    string FileName,
    string ContentType,
    byte[] Content);
