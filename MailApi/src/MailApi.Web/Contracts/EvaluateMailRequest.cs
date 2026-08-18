using System.Text.Json;
using System.Text.Json.Serialization;

namespace MailApi.Web.Contracts;

public sealed class EvaluateMailRequest
{
    [JsonPropertyName("template")]
    public string Template { get; set; } = "";

    [JsonPropertyName("data")]
    public JsonElement? Data { get; set; }
}
