using ExcelImport.Data;
using ExcelImport.Domain;
using ExcelImport.Staging;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;
using System.Text.Json;

namespace ExcelImport.Transform.Inventory;

public class InventoryImportStrategy : IImportStrategy
{
    private const int MaxRowsPerStatement = 500;

    private readonly InventoryRowValidator _validator = new();

    public string FileType => "inventory";

    public async Task ProcessChunkAsync(IReadOnlyList<ImportRow> rows, ImportContext db, CancellationToken cancellationToken = default)
    {
        var parsed = new List<(ImportRow Row, InventoryImportRow Data)>(rows.Count);
        foreach (var row in rows)
        {
            try
            {
                parsed.Add((row, JsonSerializer.Deserialize(row.RawJson, ImportJsonContext.Default.InventoryImportRow)!));
            }
            catch (Exception ex)
            {
                row.Fail($"Unreadable row payload: {ex.Message}");
            }
        }

        var skus = parsed
            .Select(p => p.Data.Sku.Trim())
            .Where(s => s.Length > 0)
            .Distinct()
            .ToList();
        var products = db.Products
            .Where(p => skus.Contains(p.Sku))
            .ToDictionary(p => p.Sku, StringComparer.Ordinal);

        var valid = new List<(ImportRow Row, Product Product, string Warehouse, int OnHand, int ReorderLevel)>();
        foreach (var (row, data) in parsed)
        {
            if (row.Status == RowStatus.Failed)
            {
                continue;
            }

            try
            {
                var validation = _validator.Validate(data);
                if (!validation.IsValid)
                {
                    row.Fail(validation);
                    continue;
                }

                var sku = data.Sku.Trim();
                if (!products.TryGetValue(sku, out var product))
                {
                    product = new Product { Sku = sku };
                    db.Products.Add(product);
                    products[sku] = product;
                }

                valid.Add((row, product, data.Warehouse.Trim(),
                    int.Parse(data.OnHand, CultureInfo.InvariantCulture),
                    string.IsNullOrWhiteSpace(data.ReorderLevel)
                        ? 0
                        : int.Parse(data.ReorderLevel, CultureInfo.InvariantCulture)));
            }
            catch (Exception ex)
            {
                row.Fail(ex.Message);
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        for (var offset = 0; offset < valid.Count; offset += MaxRowsPerStatement)
        {
            var slice = valid.GetRange(offset, Math.Min(MaxRowsPerStatement, valid.Count - offset));
            await UpsertSliceAsync(slice, db, cancellationToken);
        }
    }

    private static async Task UpsertSliceAsync(List<(ImportRow Row, Product Product, string Warehouse, int OnHand, int ReorderLevel)> slice, ImportContext db, CancellationToken cancellationToken)
    {
        var sql = new StringBuilder("INSERT INTO \"StockLevels\" (\"ProductId\", \"Warehouse\", \"OnHand\", \"ReorderLevel\") VALUES ");
        var parameters = new List<SqliteParameter>(slice.Count * 4);

        for (var i = 0; i < slice.Count; i++)
        {
            var (_, product, warehouse, onHand, reorderLevel) = slice[i];
            if (i > 0)
            {
                sql.Append(", ");
            }
            sql.Append($"(@p{i}, @w{i}, @o{i}, @r{i})");
            parameters.Add(new SqliteParameter($"@p{i}", product.Id));
            parameters.Add(new SqliteParameter($"@w{i}", warehouse));
            parameters.Add(new SqliteParameter($"@o{i}", onHand));
            parameters.Add(new SqliteParameter($"@r{i}", reorderLevel));
        }

        sql.Append(" ON CONFLICT (\"ProductId\", \"Warehouse\") DO UPDATE SET \"OnHand\" = \"excluded\".\"OnHand\", \"ReorderLevel\" = \"excluded\".\"ReorderLevel\";");

        try
        {
            await db.Database.ExecuteSqlRawAsync(sql.ToString(), parameters, cancellationToken);
            foreach (var (row, _, _, _, _) in slice)
            {
                row.Succeed();
            }
        }
        catch (Exception ex)
        {
            foreach (var (row, _, _, _, _) in slice)
            {
                row.Fail(ex.Message);
            }
        }
    }
}
