using Microsoft.EntityFrameworkCore;
using Parallelism.Domain;

namespace Parallelism.Data;

public sealed class ImportContext(DbContextOptions<ImportContext> options) : DbContext(options)
{
    public DbSet<StagedOrder> StagedOrders => Set<StagedOrder>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderLine> OrderLines => Set<OrderLine>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<StagedOrder>(e =>
        {
            e.Property(s => s.Id).UseIdentityColumn();
            foreach (var p in e.Metadata.GetProperties().Where(p => p.ClrType == typeof(string)))
            {
                p.SetMaxLength(400);
            }
        });

        modelBuilder.Entity<Customer>(e =>
        {
            e.Property(c => c.Id).UseIdentityColumn();
            e.Property(c => c.Name).HasMaxLength(200);
            e.Property(c => c.City).HasMaxLength(100);
            e.Property(c => c.Country).HasMaxLength(100);
            e.Property(c => c.Email).HasMaxLength(200);
            e.HasIndex(c => c.Name).IsUnique();
        });

        modelBuilder.Entity<Order>(e =>
        {
            e.Property(o => o.Id).UseIdentityColumn();
            e.Property(o => o.Channel).HasMaxLength(50);
            e.Property(o => o.Currency).HasMaxLength(3);
            e.Property(o => o.SalesRep).HasMaxLength(100);
            e.Property(o => o.Region).HasMaxLength(100);
            e.Property(o => o.Warehouse).HasMaxLength(100);
            e.Property(o => o.ShipMethod).HasMaxLength(50);
            e.Property(o => o.Priority).HasMaxLength(20);
            e.Property(o => o.Total).HasPrecision(18, 2);
            e.HasIndex(o => o.CustomerId);
            e.HasIndex(o => o.SourceRowNumber).IsUnique();
        });

        modelBuilder.Entity<OrderLine>(e =>
        {
            e.Property(l => l.Id).UseIdentityColumn();
            e.Property(l => l.Sku).HasMaxLength(50);
            e.Property(l => l.UnitPrice).HasPrecision(18, 2);
            e.Property(l => l.Discount).HasPrecision(18, 2);
            e.HasIndex(l => l.OrderId);
        });
    }
}
