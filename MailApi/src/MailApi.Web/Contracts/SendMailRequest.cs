using System.Text.Json;
using System.Text.Json.Serialization;

namespace MailApi.Web.Contracts;

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

    [JsonPropertyName("data")]
    public JsonElement? Data { get; set; }
}
