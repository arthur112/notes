using Api.Querying;

namespace Api.Tests;

public class UtcDayTests
{
    [Test]
    [Arguments("2026-01-01T00:00:00Z", 2026, 1, 1)]
    [Arguments("2026-01-31T23:59:59.999Z", 2026, 1, 31)]
    public async Task Bound_Is_The_Instants_Utc_Day(string instant, int year, int month, int day) =>
        // Whatever the server's time zone: a local parse would move 23:59Z to the next day east of UTC.
        await Assert.That(UtcDay.Parse(instant)).IsEqualTo(new DateOnly(year, month, day));
}
