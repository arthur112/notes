using Microsoft.Data.SqlClient;

namespace Parallelism.Data;

public static class DatabaseReset
{
    private const string Sql = """
        DELETE FROM OrderLines;
        DELETE FROM Orders;
        DELETE FROM Customers;
        TRUNCATE TABLE StagedOrders;
        """;

    public static async Task TruncateAsync(string connectionString, CancellationToken cancellationToken = default)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(Sql, connection) { CommandTimeout = 600 };
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
