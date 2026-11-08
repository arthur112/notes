using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Features.Customers;

public class CustomerEntityConfiguration : IEntityTypeConfiguration<CustomerEntity>
{
    public void Configure(EntityTypeBuilder<CustomerEntity> builder)
    {
        builder.ToTable("customers");
        builder.HasKey(c => c.Id).HasName("customers_pkey");
        builder.Property(c => c.Id).HasColumnName("id").UseIdentityColumn(1001);
        builder
            .Property(c => c.CustomerNo)
            .HasColumnName("customer_no")
            .HasMaxLength(14)
            .IsUnicode(false)
            .HasComputedColumnSql("'CUS-' + CAST([id] AS varchar(10))", stored: true);
        builder.Property(c => c.Name).HasColumnName("name").HasMaxLength(200);
        builder.Property(c => c.Email).HasColumnName("email").HasMaxLength(200);
        builder
            .Property(c => c.Segment)
            .HasColumnName("segment")
            .HasMaxLength(20)
            .HasConversion<string>();
        builder.Property(c => c.Country).HasColumnName("country").HasMaxLength(100);
        builder.Property(c => c.Active).HasColumnName("active");
        builder.Property(c => c.CreditLimit).HasColumnName("credit_limit").HasPrecision(18, 2);
        builder.Property(c => c.PaymentTermsDays).HasColumnName("payment_terms_days");
        builder.Property(c => c.IsVip).HasColumnName("is_vip");
        builder.Property(c => c.IsVerified).HasColumnName("is_verified");
        builder.Property(c => c.IsOnHold).HasColumnName("is_on_hold");
        builder
            .Property(c => c.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("CAST(SYSUTCDATETIME() AS date)");

        builder.HasIndex(c => c.CustomerNo).IsUnique().HasDatabaseName("customers_customer_no");
        builder.HasIndex(c => c.Name).IsUnique().HasDatabaseName("customers_name");

        builder
            .HasOne(c => c.Settings)
            .WithOne()
            .HasForeignKey<CustomerSettingsEntity>(s => s.CustomerId)
            .HasConstraintName("customer_settings_customer_fkey");
    }
}
