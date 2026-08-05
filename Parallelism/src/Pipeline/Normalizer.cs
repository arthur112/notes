using Microsoft.Data.SqlClient;

namespace Parallelism.Pipeline;

public static class Normalizer
{
    private const string LineTotal = """
        COALESCE(TRY_CAST(s.Qty1 AS int) * TRY_CAST(s.Price1 AS decimal(18,2)) - TRY_CAST(s.Discount1 AS decimal(18,2)), 0)
        + COALESCE(TRY_CAST(s.Qty2 AS int) * TRY_CAST(s.Price2 AS decimal(18,2)) - TRY_CAST(s.Discount2 AS decimal(18,2)), 0)
        + COALESCE(TRY_CAST(s.Qty3 AS int) * TRY_CAST(s.Price3 AS decimal(18,2)) - TRY_CAST(s.Discount3 AS decimal(18,2)), 0)
        """;

    public static async Task NormalizeAsync(string connectionString, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        await ExecuteAsync(connection, """
            INSERT INTO Customers (Name, City, Country, Email)
            SELECT s.CustomerName, MAX(s.CustomerCity), MAX(s.CustomerCountry), MAX(s.CustomerEmail)
            FROM StagedOrders s
            WHERE NOT EXISTS (SELECT 1 FROM Customers c WHERE c.Name = s.CustomerName)
            GROUP BY s.CustomerName;
            """, cancellationToken);

        await ExecuteAsync(connection, $$"""
            INSERT INTO Orders (SourceRowNumber, OrderDate, CustomerId, Channel, Currency, SalesRep, Region, Warehouse, ShipMethod, Priority, Total)
            SELECT s.RowNumber, TRY_CAST(s.OrderDate AS date), c.Id, s.Channel, s.Currency, s.SalesRep, s.Region, s.Warehouse, s.ShipMethod, s.Priority,
                   {{LineTotal}}
            FROM StagedOrders s
            JOIN Customers c ON c.Name = s.CustomerName
            WHERE NOT EXISTS (SELECT 1 FROM Orders o WHERE o.SourceRowNumber = s.RowNumber);
            """, cancellationToken);

        for (var slot = 1; slot <= 3; slot++)
        {
            await ExecuteAsync(connection, $$"""
                INSERT INTO OrderLines (OrderId, Sku, Quantity, UnitPrice, Discount)
                SELECT o.Id, s.Sku{{slot}}, TRY_CAST(s.Qty{{slot}} AS int), TRY_CAST(s.Price{{slot}} AS decimal(18,2)),
                       COALESCE(TRY_CAST(s.Discount{{slot}} AS decimal(18,2)), 0)
                FROM StagedOrders s
                JOIN Orders o ON o.SourceRowNumber = s.RowNumber
                WHERE s.Sku{{slot}} <> '';
                """, cancellationToken);
        }
    }

    private static async Task ExecuteAsync(SqlConnection connection, string sql, CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand(sql, connection) { CommandTimeout = 600 };
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
