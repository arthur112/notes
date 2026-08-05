using Microsoft.Data.SqlClient;
using Parallelism.Domain;

namespace Parallelism.Pipeline;

public static class SqlBulkFlush
{
    public static async Task FlushAsync(string connectionString, StagedOrder[] batch, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        using var bulk = new SqlBulkCopy(connection)
        {
            DestinationTableName = "StagedOrders",
            BatchSize = batch.Length,
            EnableStreaming = true,
        };
        foreach (var column in StagedOrderDataReader.ColumnNames)
        {
            bulk.ColumnMappings.Add(column, column);
        }
        using var reader = new StagedOrderDataReader(batch);
        await bulk.WriteToServerAsync(reader, cancellationToken);
    }
}
