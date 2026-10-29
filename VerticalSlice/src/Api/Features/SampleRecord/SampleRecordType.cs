using System.Text.Json.Serialization;
using NetEscapades.EnumGenerators;

namespace Api.Features.SampleRecord;

[EnumExtensions]
[JsonConverter(typeof(JsonStringEnumConverter<SampleRecordType>))]
public enum SampleRecordType
{
    A,
    B,
    C,
}
