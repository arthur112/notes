using Microsoft.Data.SqlClient;

namespace InterceptorMasking.Data;

public static class SchemaRunner
{
    private const string Database = "MaskingByInterceptor";

    public static async Task ApplyAsync(string appConnectionString, CancellationToken ct = default)
    {
        var bootstrap = new SqlConnectionStringBuilder(appConnectionString) { InitialCatalog = "master" };
        await using (var master = new SqlConnection(bootstrap.ConnectionString))
        {
            await master.OpenAsync(ct);
            await using var create = master.CreateCommand();
            create.CommandText = $"IF DB_ID('{Database}') IS NULL CREATE DATABASE [{Database}]";
            await create.ExecuteNonQueryAsync(ct);
        }

        await using var conn = new SqlConnection(appConnectionString);
        await conn.OpenAsync(ct);

        var sql = await File.ReadAllTextAsync("Migrations/0001-Setup.sql", ct);
        // Split on GO so schema changes (e.g. ALTER TABLE ... ADD column) are
        // visible to the compiler of subsequent batches in the same script.
        foreach (var batch in sql.Split("\nGO\n", StringSplitOptions.RemoveEmptyEntries))
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = batch;
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }
}
