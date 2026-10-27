using System.Text.Json.Serialization;
using Api.Json;
using NetEscapades.EnumGenerators;

namespace Api.Features.Fund;

[EnumExtensions]
[JsonConverter(typeof(CamelCaseEnumConverter<Periodicity>))]
public enum Periodicity
{
    Monthly,
    Quarterly,
    Yearly,
}
