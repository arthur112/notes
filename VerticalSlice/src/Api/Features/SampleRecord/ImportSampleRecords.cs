using Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Api.Features.SampleRecord;

/// <summary>
/// Excel rows go through the same mapper + rules as the API: existing keys are updated (rules
/// see the original), new keys are created. One query to load, one save.
/// </summary>
public static class ImportSampleRecords
{
    public record Request(IReadOnlyList<SampleRecordExcelRow> Rows);

    public record Response(int Created, int Updated);

    public static async Task<IResult> Handle(
        Request request,
        AppDbContext db,
        CancellationToken cancellationToken
    )
    {
        var keys = request.Rows.Select(r => r.ExternalKey).ToList();
        var existing = await db
            .SampleRecords.Where(r => keys.Contains(r.ExternalKey))
            .ToDictionaryAsync(r => r.ExternalKey, cancellationToken);

        int created = 0, updated = 0;
        foreach (var row in request.Rows)
        {
            if (existing.TryGetValue(row.ExternalKey, out var entity))
            {
                var original = SampleRecordWrite.Snapshot(db, entity);
                entity.MapFrom(row);
                await SampleRecordWrite.ApplyRulesAsync(db, entity, original, cancellationToken);
                updated++;
            }
            else
            {
                entity = new SampleRecordEntity();
                entity.MapFrom(row);
                await SampleRecordWrite.ApplyRulesAsync(db, entity, null, cancellationToken);
                db.SampleRecords.Add(entity);
                existing[row.ExternalKey] = entity;
                created++;
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(new Response(created, updated));
    }
}
