using Api.Features.Fund;
using Microsoft.EntityFrameworkCore;

namespace Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options, IConfiguration? config = null)
    : DbContext(options)
{
    public string SchemaName { get; set; } = config?["Database:Schema"] ?? "dbo";

    public DbSet<FundEntity> Funds => Set<FundEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(SchemaName);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
