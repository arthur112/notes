using System.Text.Json.Serialization;

namespace MailApi.Web.Contracts;

/// <summary>
/// A file attachment as it travels on the wire: base64 content inside the JSON payload.
/// Meant for small files (reports, exports) — see DESIGN.md.
/// </summary>
public sealed class MailAttachmentRequest
{
    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = "";

    [JsonPropertyName("contentType")]
    public string? ContentType { get; set; }

    [JsonPropertyName("content")]
    public string Content { get; set; } = "";
}
