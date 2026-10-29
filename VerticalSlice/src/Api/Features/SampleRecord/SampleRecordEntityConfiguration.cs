using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Features.SampleRecord;

public class SampleRecordEntityConfiguration : IEntityTypeConfiguration<SampleRecordEntity>
{
    public void Configure(EntityTypeBuilder<SampleRecordEntity> builder)
    {
        builder.ToTable("sample_records");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasColumnName("id");
        builder
            .Property(r => r.PublicId)
            .HasColumnName("public_id")
            .HasDefaultValueSql("NEWID()")
            .ValueGeneratedOnAdd();
        builder.Property(r => r.ExternalKey).HasColumnName("external_key").HasMaxLength(100);
        builder.HasIndex(r => r.ExternalKey).IsUnique().HasDatabaseName("ux_sample_records_external_key");
        builder.Property(r => r.Type).HasColumnName("type").HasMaxLength(10).HasConversion<string>();
        builder.Property(r => r.CustId).HasColumnName("cust_id").HasMaxLength(50);
        builder.Property(r => r.Priority).HasColumnName("priority");
        builder.Property(r => r.Currency).HasColumnName("currency").HasMaxLength(3);
        builder.Property(r => r.PaymentTermDays).HasColumnName("payment_term_days");
        builder.Property(r => r.EdiCode).HasColumnName("edi_code").HasMaxLength(50);
        builder.Property(r => r.EdiPartner).HasColumnName("edi_partner").HasMaxLength(100);
        builder.Property(r => r.Description).HasColumnName("description");
        builder.Property(r => r.Reference).HasColumnName("reference").HasMaxLength(100);
        builder.Property(r => r.Amount).HasColumnName("amount").HasPrecision(18, 2);
        builder.Property(r => r.Quantity).HasColumnName("quantity").HasPrecision(18, 4);
        builder.Property(r => r.OrderDate).HasColumnName("order_date");
        builder.Property(r => r.DueDate).HasColumnName("due_date");
        builder.Property(r => r.CreatedAt).HasColumnName("created_at");
        builder.Property(r => r.UpdatedAt).HasColumnName("updated_at");
    }
}
