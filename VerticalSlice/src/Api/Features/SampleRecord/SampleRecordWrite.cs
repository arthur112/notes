using Api.Data;

namespace Api.Features.SampleRecord;

/// <summary>
/// The write path shared by create, update and import: map with <see cref="SampleRecordMapper"/>,
/// then <see cref="ApplyRulesAsync"/>. No other code assigns entity columns.
/// </summary>
public static class SampleRecordWrite
{
    /// <summary>The values as loaded from the database, taken before the mapper overwrites them.</summary>
    public static SampleRecordEntity Snapshot(AppDbContext db, SampleRecordEntity entity) =>
        (SampleRecordEntity)db.Entry(entity).OriginalValues.ToObject();

    /// <summary>
    /// <c>FindAsync</c> checks the change tracker first, so an import hitting the same customer
    /// many times loads its settings once (a customer without settings is queried per row).
    /// </summary>
    public static async Task ApplyRulesAsync(
        AppDbContext db,
        SampleRecordEntity entity,
        SampleRecordEntity? original,
        CancellationToken cancellationToken
    )
    {
        var settings = await db.CustomerSettings.FindAsync([entity.CustId], cancellationToken);
        SampleRecordRules.Run(new RuleContext(entity, original, settings));
    }
}
