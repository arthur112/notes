using System.Text.Json;
using CSharpFunctionalExtensions;
using MailApi.Application.SendMail;

namespace MailApi.Web.Mapping;

internal static class JsonTemplateDataConverter
{
    public static Result<IReadOnlyDictionary<string, object?>, MailError> ToLiquidModel(JsonElement? element)
    {
        if (element is null or { ValueKind: JsonValueKind.Null or JsonValueKind.Undefined })
            return Result.Success<IReadOnlyDictionary<string, object?>, MailError>(
                new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase));

        if (element is not { ValueKind: JsonValueKind.Object } value)
            return Result.Failure<IReadOnlyDictionary<string, object?>, MailError>(
                MailError.Validation("'data' must be a JSON object."));

        return Result.Success<IReadOnlyDictionary<string, object?>, MailError>(
            (Dictionary<string, object?>)ToObject(value)!);
    }

    private static object? ToObject(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.Object => element.EnumerateObject().Aggregate(
            new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase),
            (dictionary, property) => { dictionary[property.Name] = ToObject(property.Value); return dictionary; }),
        JsonValueKind.Array => element.EnumerateArray().Select(ToObject).ToList(),
        JsonValueKind.String => element.GetString(),
        JsonValueKind.Number => element.TryGetInt64(out var integer) ? integer : element.GetDouble(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        _ => null,
    };
}
