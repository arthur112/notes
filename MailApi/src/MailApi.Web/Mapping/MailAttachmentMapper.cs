using MailApi.Domain;
using MailApi.Web.Contracts;

namespace MailApi.Web.Mapping;

/// <summary>
/// Maps wire attachments (base64 in JSON) to domain attachments. Validity (file names, base64,
/// total size) is guaranteed upstream by <see cref="Validation.SendMailRequestValidator"/>, so
/// this is pure mapping. Base64 keeps the API a plain JSON contract — per DESIGN.md, attachments
/// are for small files only.
/// </summary>
public static class MailAttachmentMapper
{
    private const string DefaultContentType = "application/octet-stream";

    public static IReadOnlyList<MailAttachment> ToDomain(List<MailAttachmentRequest>? requests) =>
        requests is null || requests.Count == 0
            ? []
            : requests.ConvertAll(request => new MailAttachment(
                request.FileName,
                string.IsNullOrWhiteSpace(request.ContentType) ? DefaultContentType : request.ContentType,
                Convert.FromBase64String(request.Content)));
}
