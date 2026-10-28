using System.Text.Json;

namespace Api.Features.Fund;

/// <summary>
/// <see cref="FundEntity.PermanentInformation"/> keeps the payload as raw JSON text in an
/// <c>nvarchar(max)</c> column (handy for raw-SQL consumers), while the fund responses expose
/// the same payload as a JSON object, so it has to be re-parsed here.
/// </summary>
internal static class PermanentInformationJson
{
    internal static JsonElement? ToElement(string? raw) =>
        raw is null ? null : JsonDocument.Parse(raw).RootElement;
}
