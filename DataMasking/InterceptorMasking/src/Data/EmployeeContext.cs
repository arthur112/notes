using InterceptorMasking.Auth;
using Microsoft.EntityFrameworkCore;

namespace InterceptorMasking.Data;

public sealed class EmployeeContext(DbContextOptions<EmployeeContext> options, ICurrentUser currentUser)
    : DbContext(options)
{
    /// <summary>Read by UserAwareModelCacheKeyFactory: admin and non-admin models differ.</summary>
    public bool IsAdmin => currentUser.IsAdmin;

    public DbSet<Employee> Employees => Set<Employee>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Employee>(e =>
        {
            e.ToTable("Employees", "dbo");
            e.Property(x => x.FirstName).HasMaxLength(50);
            e.Property(x => x.LastName).HasMaxLength(50);
            e.Property(x => x.Email).HasMaxLength(100);
            e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.Salary).HasPrecision(18, 2);
            e.Property(x => x.Iban).HasMaxLength(34);

            // Value-converter masking: applied only in the non-admin model.
            if (!currentUser.IsAdmin)
                e.Property(x => x.Iban).HasConversion(MaskingConverters.For(MaskKind.Iban));
        });
    }
}
