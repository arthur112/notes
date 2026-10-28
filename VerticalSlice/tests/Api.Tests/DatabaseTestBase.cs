using Api.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using TUnit.AspNetCore;

namespace Api.Tests;

public abstract class DatabaseTestBase : WebApplicationTest<ApiWebFactory, Program>
{
    protected string SchemaName { get; private set; } = null!;

    private string ConnectionString => GlobalFactory.Aspire.ConnectionString;

    protected override async Task SetupAsync()
    {
        SchemaName = GetIsolatedName("test").ToLowerInvariant();

        await ExecuteAsync($"CREATE SCHEMA [{SchemaName}];");

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
            .UseSqlServer(ConnectionString)
            .ReplaceService<IModelCacheKeyFactory, SchemaModelCacheKeyFactory>()
            .Options;

    protected override void ConfigureTestConfiguration(IConfigurationBuilder config) =>
        config.AddInMemoryCollection(
            new Dictionary<string, string?> { ["Database:Schema"] = SchemaName }
        );

    // SQL Server has no DROP SCHEMA ... CASCADE: drop the foreign keys, then the tables, then
    // the schema.
    [After(Test)]
    public Task DropSchema() =>
        ExecuteAsync(
            $"""
            DECLARE @schema sysname = N'{SchemaName}', @sql nvarchar(max) = N'';
            SELECT @sql += N'ALTER TABLE ' + QUOTENAME(@schema) + N'.' + QUOTENAME(OBJECT_NAME(parent_object_id))
                + N' DROP CONSTRAINT ' + QUOTENAME(name) + N';'
            FROM sys.foreign_keys WHERE schema_id = SCHEMA_ID(@schema);
            SELECT @sql += N'DROP TABLE ' + QUOTENAME(@schema) + N'.' + QUOTENAME(name) + N';'
            FROM sys.tables WHERE schema_id = SCHEMA_ID(@schema);
            SET @sql += N'DROP SCHEMA IF EXISTS ' + QUOTENAME(@schema) + N';';
            EXEC sp_executesql @sql;
            """
        );

    private async Task ExecuteAsync(string sql)
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        await command.ExecuteNonQueryAsync();
    }
}
