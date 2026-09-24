using System.Text.Json.Serialization;

namespace MailApi.Contracts;

/// <summary>
/// A file attachment for <see cref="SendMailRequest"/>. The content travels as base64
/// inside the JSON payload — meant for small files (reports, exports), per DESIGN.md.
/// </summary>
public sealed class MailAttachment
{
    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = "";

    [JsonPropertyName("contentType")]
    public string? ContentType { get; set; }

    [JsonPropertyName("content")]
    public string Content { get; set; } = "";

    /// <summary>Creates an attachment from in-memory bytes, base64-encoding them.</summary>
    public static MailAttachment FromBytes(string fileName, byte[] content, string? contentType = null) =>
        new() { FileName = fileName, ContentType = contentType, Content = Convert.ToBase64String(content) };

    /// <summary>Creates an attachment from a file on disk, base64-encoding its content.</summary>
    public static MailAttachment FromFile(string path, string? contentType = null) =>
        FromBytes(Path.GetFileName(path), File.ReadAllBytes(path), contentType);
}
