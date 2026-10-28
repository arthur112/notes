using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Features.Fund;

public class FundEntityConfiguration : IEntityTypeConfiguration<FundEntity>
{
    public void Configure(EntityTypeBuilder<FundEntity> builder)
    {
        builder.ToTable("funds");
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Id).HasColumnName("id");
        builder
            .Property(f => f.PublicId)
            .HasColumnName("public_id")
            .HasDefaultValueSql("NEWID()")
            .ValueGeneratedOnAdd();
        builder.Property(f => f.Name).HasColumnName("name");
        builder.Property(f => f.PermanentInformation).HasColumnName("permanent_information");
        builder
            .Property(f => f.Periodicity)
            .HasColumnName("periodicity")
            .HasConversion<string>(
                v => v.ToStringFast().ToLowerInvariant(),
                v => PeriodicityExtensions.Parse(v, ignoreCase: true)
            );
    }
}
