using System.Text.Json;
using System.Text.Json.Serialization;

namespace MailApi;

public sealed class SendMailRequest
{
    [JsonPropertyName("template")]
    public string Template { get; set; } = "";

    [JsonPropertyName("to")]
    public List<string> To { get; set; } = [];

    [JsonPropertyName("cc")]
    public List<string>? Cc { get; set; }

    /// <summary>Overrides the companion <c>{template}.subject.liquid</c> file when set.</summary>
    [JsonPropertyName("subject")]
    public string? Subject { get; set; }

    /// <summary>Liquid model. Deserialized into a case-insensitive dictionary tree.</summary>
    [JsonPropertyName("data")]
    public JsonElement? Data { get; set; }
}

internal static class DataConverter
{
    /// <summary>Turns the JSON payload into a nested, case-insensitive dictionary tree Fluid can read.</summary>
    public static object ToLiquidModel(JsonElement? element)
    {
        if (element is not { } el) return new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        return ToObject(el) ?? new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
    }

    private static object? ToObject(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.Object => el.EnumerateObject().Aggregate(
            new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase),
            (dict, prop) => { dict[prop.Name] = ToObject(prop.Value); return dict; }),
        JsonValueKind.Array => el.EnumerateArray().Select(ToObject).ToList(),
        JsonValueKind.String => (object?)el.GetString(),
        JsonValueKind.Number => el.TryGetInt64(out var lng) ? lng : el.GetDouble(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        _ => null,
    };
}
