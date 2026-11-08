using System.Text.Json.Serialization;

namespace Api.Features.Customers;

[JsonConverter(typeof(JsonStringEnumConverter<Segment>))]
public enum Segment
{
    Enterprise,
    SMB,
    Startup,
}
