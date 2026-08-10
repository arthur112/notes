using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StranglerTable.Data;
using StranglerTable.Domain;

namespace StranglerTable.Split;

public class SplitDbContext(DbContextOptions<SplitDbContext> options, MigrationPhase phase) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Order>(e =>
        {
            e.ToTable("LegacyOrders");
            e.HasKey(o => o.Id);
            e.Ignore(o => o.Total);
            e.Property(o => o.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(o => o.OrderNumber).HasMaxLength(30);
            e.Property(o => o.Channel).HasMaxLength(20);
            e.Property(o => o.Currency).HasMaxLength(3);
            e.Property(o => o.SubTotal).HasPrecision(18, 2);
            e.Property(o => o.Tax).HasPrecision(18, 2);
            e.Property(o => o.ShippingCost).HasPrecision(18, 2);
            e.Property(o => o.Notes).HasMaxLength(500);

            e.OwnsOne(o => o.Customer, c =>
            {
                c.Property(x => x.ExternalRef).HasColumnName("CustomerRef").HasMaxLength(30);
                c.Property(x => x.FirstName).HasColumnName("CustomerFirstName").HasMaxLength(60);
                c.Property(x => x.LastName).HasColumnName("CustomerLastName").HasMaxLength(60);
                c.Property(x => x.Email).HasColumnName("CustomerEmail").HasMaxLength(120);
                c.Property(x => x.Phone).HasColumnName("CustomerPhone").HasMaxLength(30);
                c.Property(x => x.Company).HasColumnName("CustomerCompany").HasMaxLength(120);
                c.Property(x => x.VatNumber).HasColumnName("CustomerVatNumber").HasMaxLength(30);
                c.Property(x => x.Segment).HasColumnName("CustomerSegment").HasMaxLength(30);
            });

            e.OwnsOne(o => o.BillingAddress, a =>
            {
                if (phase.IsPhase2)
                {
                    a.ToTable("Addresses");
                    MapAddress(a, "");
                }
                else
                {
                    MapAddress(a, "Billing");
                }
            });

            e.OwnsOne(o => o.ShippingAddress, a => MapAddress(a, "Shipping"));

            e.OwnsOne(o => o.Fulfillment, f =>
            {
                f.Property(x => x.Carrier).HasColumnName("Carrier").HasMaxLength(40);
                f.Property(x => x.TrackingNumber).HasColumnName("TrackingNumber").HasMaxLength(60);
                f.Property(x => x.ShippedDate).HasColumnName("ShippedDate");
                f.Property(x => x.DeliveredDate).HasColumnName("DeliveredDate");
                f.Property(x => x.RequiresSignature).HasColumnName("RequiresSignature");
            });

            e.OwnsOne(o => o.Audit, a =>
            {
                a.Property(x => x.CreatedAt).HasColumnName("CreatedAt");
                a.Property(x => x.CreatedBy).HasColumnName("CreatedBy").HasMaxLength(60);
                a.Property(x => x.UpdatedAt).HasColumnName("UpdatedAt");
                a.Property(x => x.UpdatedBy).HasColumnName("UpdatedBy").HasMaxLength(60);
            });
        });
    }

    private static void MapAddress<TOwner>(
        OwnedNavigationBuilder<TOwner, Address> a, string prefix) where TOwner : class
    {
        a.Property(x => x.Street).HasColumnName(prefix + "Street").HasMaxLength(120);
        a.Property(x => x.Street2).HasColumnName(prefix + "Street2").HasMaxLength(120);
        a.Property(x => x.City).HasColumnName(prefix + "City").HasMaxLength(80);
        a.Property(x => x.Zip).HasColumnName(prefix + "Zip").HasMaxLength(15);
        a.Property(x => x.State).HasColumnName(prefix + "State").HasMaxLength(60);
        a.Property(x => x.Country).HasColumnName(prefix + "Country").HasMaxLength(60);
    }
}
