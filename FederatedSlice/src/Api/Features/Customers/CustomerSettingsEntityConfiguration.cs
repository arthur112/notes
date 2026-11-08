using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Features.Customers;

public class CustomerSettingsEntityConfiguration : IEntityTypeConfiguration<CustomerSettingsEntity>
{
    public void Configure(EntityTypeBuilder<CustomerSettingsEntity> builder)
    {
        builder.ToTable("customer_settings");
        builder.HasKey(s => s.CustomerId).HasName("customer_settings_pkey");
        builder.Property(s => s.CustomerId).HasColumnName("customer_id").ValueGeneratedNever();
        builder
            .Property(s => s.InitialStatus)
            .HasColumnName("initial_status")
            .HasMaxLength(20)
            .HasConversion<string>();
        builder.Property(s => s.ForcedDueDays).HasColumnName("forced_due_days");
    }
}
