using System.Text.Json.Serialization;
using NetEscapades.EnumGenerators;

namespace Api.Features.Fund;

[EnumExtensions]
[JsonConverter(typeof(JsonStringEnumConverter<Periodicity>))]
public enum Periodicity
{
    Monthly,
    Quarterly,
    Yearly,
}
