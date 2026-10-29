using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Features.SampleRecord;

public class CustomerSettingsEntityConfiguration : IEntityTypeConfiguration<CustomerSettingsEntity>
{
    public void Configure(EntityTypeBuilder<CustomerSettingsEntity> builder)
    {
        builder.ToTable("customer_settings");
        builder.HasKey(s => s.CustId);
        builder.Property(s => s.CustId).HasColumnName("cust_id").HasMaxLength(50);
        builder.Property(s => s.DefaultPaymentTermDays).HasColumnName("default_payment_term_days");
        builder.Property(s => s.ForcedCurrency).HasColumnName("forced_currency").HasMaxLength(3);
    }
}
