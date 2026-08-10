using Microsoft.EntityFrameworkCore;
using StranglerTable.Data;

namespace StranglerTable.Acl;

public class AclDbContext(DbContextOptions<AclDbContext> options, MigrationPhase phase) : DbContext(options)
{
    public DbSet<LegacyOrderRow> LegacyOrders => Set<LegacyOrderRow>();
    public DbSet<OrderRowV2> OrdersV2 => Set<OrderRowV2>();
    public DbSet<BillingAddressRow> BillingAddresses => Set<BillingAddressRow>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        if (!phase.IsPhase2)
        {
            modelBuilder.Entity<LegacyOrderRow>(e =>
            {
                e.ToTable("LegacyOrders");
                e.HasKey(x => x.Id);
                e.Property(x => x.SubTotal).HasPrecision(18, 2);
                e.Property(x => x.Tax).HasPrecision(18, 2);
                e.Property(x => x.ShippingCost).HasPrecision(18, 2);
                e.Property(x => x.LegacyDiscount).HasPrecision(18, 2);
            });
            modelBuilder.Ignore<OrderRowV2>();
            modelBuilder.Ignore<BillingAddressRow>();
        }
        else
        {
            modelBuilder.Entity<OrderRowV2>(e =>
            {
                e.ToTable("LegacyOrders");
                e.HasKey(x => x.Id);
                e.Property(x => x.SubTotal).HasPrecision(18, 2);
                e.Property(x => x.Tax).HasPrecision(18, 2);
                e.Property(x => x.ShippingCost).HasPrecision(18, 2);
                e.Property(x => x.LegacyDiscount).HasPrecision(18, 2);
                e.HasOne(x => x.BillingAddress)
                    .WithOne()
                    .HasForeignKey<BillingAddressRow>(x => x.OrderId);
            });
            modelBuilder.Entity<BillingAddressRow>(e =>
            {
                e.ToTable("Addresses");
                e.HasKey(x => x.OrderId);
            });
            modelBuilder.Ignore<LegacyOrderRow>();
        }
    }
}
