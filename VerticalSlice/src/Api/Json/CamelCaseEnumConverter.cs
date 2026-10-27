using System.Text.Json;
using System.Text.Json.Serialization;

namespace Api.Json;

public sealed class CamelCaseEnumConverter<TEnum>()
    : JsonStringEnumConverter<TEnum>(JsonNamingPolicy.CamelCase)
    where TEnum : struct, Enum;
