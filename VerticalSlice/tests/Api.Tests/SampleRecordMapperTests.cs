using Api.Features.SampleRecord;
using Api.Tests.Builders;

namespace Api.Tests;

public class SampleRecordMapperTests
{
    // Set by the database or the audit interceptor, never by the mapper. With hand-written
    // mapping this test is what catches a column the Excel mapping forgot.
    private static readonly string[] NotMapped =
    [
        nameof(SampleRecordEntity.Id),
        nameof(SampleRecordEntity.PublicId),
        nameof(SampleRecordEntity.CreatedAt),
        nameof(SampleRecordEntity.UpdatedAt),
    ];

    [Test]
    public async Task ExcelRow_With_Every_Property_Set_Leaves_No_Entity_Property_At_Default()
    {
        var entity = new SampleRecordEntity();

        entity.MapFrom(SampleRecordExcelRowBuilder.Create().Build());

        var atDefault = typeof(SampleRecordEntity)
            .GetProperties()
            .Where(p => !NotMapped.Contains(p.Name))
            .Where(p =>
            {
                var value = p.GetValue(entity);
                var type = Nullable.GetUnderlyingType(p.PropertyType) ?? p.PropertyType;
                return value is null
                    || value is ""
                    || (type.IsValueType && value.Equals(Activator.CreateInstance(type)));
            })
            .Select(p => p.Name);

        await Assert.That(atDefault).IsEmpty();
    }
}
