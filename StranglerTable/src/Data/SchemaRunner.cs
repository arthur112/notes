using Microsoft.Data.SqlClient;

namespace StranglerTable.Data;

public static class SchemaRunner
{
    public static async Task ApplyAsync(string connectionString, bool phase2, CancellationToken ct = default)
    {
        var builder = new SqlConnectionStringBuilder(connectionString);
        var database = builder.InitialCatalog;

        builder.InitialCatalog = "master";
        await using (var master = new SqlConnection(builder.ConnectionString))
        {
            await master.OpenAsync(ct);
            await using var create = master.CreateCommand();
            create.CommandText = $"IF DB_ID('{database}') IS NULL CREATE DATABASE [{database}]";
            await create.ExecuteNonQueryAsync(ct);
        }

        await using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync(ct);

        await ExecuteScriptAsync(conn, "Migrations/0001-CreateLegacyOrders.sql", ct);
        if (phase2)
            await ExecuteScriptAsync(conn, "Migrations/0002-SplitBillingAddresses.sql", ct);
    }

    private static async Task ExecuteScriptAsync(SqlConnection conn, string path, CancellationToken ct)
    {
        var sql = await File.ReadAllTextAsync(path, ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
