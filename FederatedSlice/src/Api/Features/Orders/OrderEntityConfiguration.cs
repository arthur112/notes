using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Features.Orders;

public class OrderEntityConfiguration : IEntityTypeConfiguration<OrderEntity>
{
    public void Configure(EntityTypeBuilder<OrderEntity> builder)
    {
        builder.ToTable("orders");
        builder.HasKey(o => o.Id).HasName("orders_pkey");
        builder.Property(o => o.Id).HasColumnName("id").UseIdentityColumn(100101);
        builder
            .Property(o => o.OrderNo)
            .HasColumnName("order_no")
            .HasMaxLength(14)
            .IsUnicode(false)
            .HasComputedColumnSql("'ORD-' + CAST([id] AS varchar(10))", stored: true);
        builder.Property(o => o.CustomerId).HasColumnName("customer_id");
        builder
            .Property(o => o.Status)
            .HasColumnName("status")
            .HasMaxLength(20)
            .HasConversion<string>();
        builder.Property(o => o.DueDate).HasColumnName("due_date");
        builder.Property(o => o.IsUrgent).HasColumnName("is_urgent");
        builder.Property(o => o.InvoicedAt).HasColumnName("invoiced_at");
        builder.Property(o => o.Reference).HasColumnName("reference").HasMaxLength(50);
        builder
            .Property(o => o.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("CAST(SYSUTCDATETIME() AS date)");

        builder.HasIndex(o => o.OrderNo).IsUnique().HasDatabaseName("orders_order_no");
        builder
            .HasIndex(o => o.Reference)
            .IsUnique()
            .HasFilter("[reference] IS NOT NULL")
            .HasDatabaseName("orders_reference");

        builder
            .HasOne(o => o.Customer)
            .WithMany()
            .HasForeignKey(o => o.CustomerId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("orders_customer_fkey");
        builder
            .HasMany(o => o.Lines)
            .WithOne()
            .HasForeignKey(l => l.OrderId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("order_lines_order_fkey");
    }
}

public class OrderLineEntityConfiguration : IEntityTypeConfiguration<OrderLineEntity>
{
    public void Configure(EntityTypeBuilder<OrderLineEntity> builder)
    {
        builder.ToTable("order_lines");
        builder.HasKey(l => l.Id).HasName("order_lines_pkey");
        builder.Property(l => l.Id).HasColumnName("id");
        builder.Property(l => l.OrderId).HasColumnName("order_id");
        builder.Property(l => l.Product).HasColumnName("product").HasMaxLength(200);
        builder.Property(l => l.Quantity).HasColumnName("quantity");
        builder.Property(l => l.UnitPrice).HasColumnName("unit_price").HasPrecision(18, 2);
    }
}
