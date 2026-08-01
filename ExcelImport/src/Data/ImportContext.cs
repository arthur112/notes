using ExcelImport.Domain;
using ExcelImport.Staging;
using Microsoft.EntityFrameworkCore;

namespace ExcelImport.Data;

public class ImportContext : DbContext
{
    public DbSet<ImportBatch> Batches { get; set; } = null!;
    public DbSet<ImportRow> Rows { get; set; } = null!;
    public DbSet<Customer> Customers { get; set; } = null!;
    public DbSet<Order> Orders { get; set; } = null!;
    public DbSet<OrderLine> OrderLines { get; set; } = null!;
    public DbSet<Product> Products { get; set; } = null!;
    public DbSet<StockLevel> StockLevels { get; set; } = null!;

    public ImportContext(DbContextOptions<ImportContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ImportBatch>(b =>
        {
            b.ToTable("ImportBatches");
            b.HasKey(x => x.Id);
            b.Property(x => x.FileName).IsRequired();
            b.Property(x => x.FileType).IsRequired();
            b.HasMany(x => x.Rows)
             .WithOne(x => x.Batch)
             .HasForeignKey(x => x.BatchId);
        });

        modelBuilder.Entity<ImportRow>(r =>
        {
            r.ToTable("ImportRows");
            r.HasKey(x => x.Id);
            r.Property(x => x.RawJson).IsRequired();
        });

        modelBuilder.Entity<Customer>(c =>
        {
            c.ToTable("Customers");
            c.HasKey(x => x.Id);
            c.Property(x => x.Name).IsRequired();
            c.HasIndex(x => x.Name).IsUnique();
            c.HasMany(x => x.Orders)
             .WithOne(x => x.Customer)
             .HasForeignKey(x => x.CustomerId);
        });

        modelBuilder.Entity<Order>(o =>
        {
            o.ToTable("Orders");
            o.HasKey(x => x.Id);
            o.HasMany(x => x.Lines)
             .WithOne(x => x.Order)
             .HasForeignKey(x => x.OrderId);
        });

        modelBuilder.Entity<OrderLine>(l =>
        {
            l.ToTable("OrderLines");
            l.HasKey(x => x.Id);
            l.Property(x => x.ProductCode).IsRequired();
        });

        modelBuilder.Entity<Product>(p =>
        {
            p.ToTable("Products");
            p.HasKey(x => x.Id);
            p.Property(x => x.Sku).IsRequired();
            p.HasIndex(x => x.Sku).IsUnique();
            p.HasMany(x => x.StockLevels)
             .WithOne(x => x.Product)
             .HasForeignKey(x => x.ProductId);
        });

        modelBuilder.Entity<StockLevel>(s =>
        {
            s.ToTable("StockLevels");
            s.HasKey(x => x.Id);
            s.Property(x => x.Warehouse).IsRequired();
            s.HasIndex(x => new { x.ProductId, x.Warehouse }).IsUnique();
        });
    }
}
