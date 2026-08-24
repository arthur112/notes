using Microsoft.Data.SqlClient;

namespace ConnectionStringSwitching.Data;

public static class SchemaRunner
{
    private const string Database = "MaskingByLogin";

    public static async Task ApplyAsync(string bootstrapConnectionString, CancellationToken ct = default)
    {
        await using (var master = new SqlConnection(bootstrapConnectionString))
        {
            await master.OpenAsync(ct);
            await using var create = master.CreateCommand();
            create.CommandText = $"IF DB_ID('{Database}') IS NULL CREATE DATABASE [{Database}]";
            await create.ExecuteNonQueryAsync(ct);
        }

        var builder = new SqlConnectionStringBuilder(bootstrapConnectionString) { InitialCatalog = Database };
        await using var conn = new SqlConnection(builder.ConnectionString);
        await conn.OpenAsync(ct);

        var sql = await File.ReadAllTextAsync("Migrations/0001-Setup.sql", ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
