using Api.Features.Fund;
using Api.Features.SampleRecord;
using Microsoft.EntityFrameworkCore;

namespace Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options, IConfiguration? config = null)
    : DbContext(options)
{
    public string SchemaName { get; set; } = config?["Database:Schema"] ?? "dbo";

    public DbSet<FundEntity> Funds => Set<FundEntity>();
    public DbSet<SampleRecordEntity> SampleRecords => Set<SampleRecordEntity>();
    public DbSet<CustomerSettingsEntity> CustomerSettings => Set<CustomerSettingsEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(SchemaName);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
