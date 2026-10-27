using grate.Configuration;
using grate.Migration;
using grate.postgresql.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

var connectionString =
    Environment.GetEnvironmentVariable("ConnectionStrings__app")
    ?? throw new InvalidOperationException("ConnectionStrings__app is required");

var services = new ServiceCollection();
services.AddLogging(logging => logging.AddConsole());
services.AddGrateWithPostgreSQL(
    new GrateConfiguration
    {
        ConnectionString = connectionString,
        SqlFilesDirectory = new DirectoryInfo(Path.Combine(AppContext.BaseDirectory, "db")),
        OutputPath = new DirectoryInfo(Path.Combine(Path.GetTempPath(), "grate")),
        NonInteractive = true,
    }
);

await using var provider = services.BuildServiceProvider();
try
{
    await provider.GetRequiredService<IGrateMigrator>().Migrate();
    return 0;
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Database migration failed: {ex.Message}");
    return 1;
}
