using System.Globalization;

namespace Api.Querying;

public static class UtcDay
{
    /// <summary>
    /// A Gridify converter for <see cref="DateOnly"/> columns. The front sends a day range as UTC
    /// instants (<c>createdAt&gt;=2026-01-01T00:00:00Z,createdAt&lt;=2026-01-31T23:59:59.999Z</c>),
    /// and their UTC day is the bound, so both ends stay inclusive.
    /// </summary>
    public static object Parse(string value) =>
        DateOnly.FromDateTime(
            DateTime.Parse(
                value,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal
            )
        );
}
