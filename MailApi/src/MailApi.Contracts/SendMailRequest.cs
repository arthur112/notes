using System.Text.Json.Serialization;

namespace MailApi.Contracts;

/// <summary>
/// The wire contract for <c>POST /api/mail/send</c>, shared by the API (model binding) and
/// the SDK (serialization), so the JSON shape is defined exactly once.
/// </summary>
public sealed class SendMailRequest
{
    [JsonPropertyName("template")]
    public string Template { get; set; } = "";

    [JsonPropertyName("to")]
    public List<string>? To { get; set; }

    [JsonPropertyName("cc")]
    public List<string>? Cc { get; set; }

    [JsonPropertyName("subject")]
    public string? Subject { get; set; }

    /// <summary>The Liquid model. Deserializes as a <see cref="System.Text.Json.JsonElement"/>.</summary>
    [JsonPropertyName("data")]
    public object? Data { get; set; }

    [JsonPropertyName("attachments")]
    public List<MailAttachment>? Attachments { get; set; }
}
