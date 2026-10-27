using Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Npgsql;
using TUnit.AspNetCore;

namespace Api.Tests;

public abstract class DatabaseTestBase : WebApplicationTest<ApiWebFactory, Program>
{
    protected string SchemaName { get; private set; } = null!;

    private string ConnectionString => GlobalFactory.Aspire.PostgresConnectionString;

    protected override async Task SetupAsync()
    {
        SchemaName = GetIsolatedName("test").ToLowerInvariant();

        await using (var connection = new NpgsqlConnection(ConnectionString))
        {
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = $"""CREATE SCHEMA "{SchemaName}";""";
            await command.ExecuteNonQueryAsync();
        }

        await using var dbContext = CreateDbContext();
        var creator = (RelationalDatabaseCreator)dbContext.Database.GetService<IDatabaseCreator>();
        await creator.CreateTablesAsync();
    }

    protected AppDbContext CreateDbContext() => new(CreateOptions()) { SchemaName = SchemaName };

    protected async Task<T> SeedAsync<T>(T entity)
        where T : class
    {
        await using var dbContext = CreateDbContext();
        dbContext.Add(entity);
        await dbContext.SaveChangesAsync();
        return entity;
    }

    private DbContextOptions<AppDbContext> CreateOptions() =>
        new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(ConnectionString)
            .ReplaceService<IModelCacheKeyFactory, SchemaModelCacheKeyFactory>()
            .Options;

    protected override void ConfigureTestConfiguration(IConfigurationBuilder config) =>
        config.AddInMemoryCollection(
            new Dictionary<string, string?> { ["Database:Schema"] = SchemaName }
        );

    [After(Test)]
    public async Task DropSchema()
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = $"""DROP SCHEMA IF EXISTS "{SchemaName}" CASCADE;""";
        await command.ExecuteNonQueryAsync();
    }
}
