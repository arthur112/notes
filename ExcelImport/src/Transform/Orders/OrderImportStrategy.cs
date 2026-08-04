using ExcelImport.Data;
using ExcelImport.Domain;
using ExcelImport.Staging;
using System.Globalization;
using System.Text.Json;

namespace ExcelImport.Transform.Orders;

public class OrderImportStrategy : IImportStrategy
{
    private readonly OrderRowValidator _validator = new();

    public string FileType => "orders";

    public Task ProcessChunkAsync(IReadOnlyList<ImportRow> rows, ImportContext db, CancellationToken cancellationToken = default)
    {
        var parsed = new List<(ImportRow Row, OrderImportRow Data)>(rows.Count);
        foreach (var row in rows)
        {
            try
            {
                parsed.Add((row, JsonSerializer.Deserialize(row.RawJson, ImportJsonContext.Default.OrderImportRow)!));
            }
            catch (Exception ex)
            {
                row.Fail($"Unreadable row payload: {ex.Message}");
            }
        }

        var names = parsed
            .Select(p => p.Data.CustomerName.Trim())
            .Where(n => n.Length > 0)
            .Distinct()
            .ToList();
        var customers = db.Customers
            .Where(c => names.Contains(c.Name))
            .ToDictionary(c => c.Name, StringComparer.Ordinal);

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

                var customerName = data.CustomerName.Trim();
                if (!customers.TryGetValue(customerName, out var customer))
                {
                    customer = new Customer { Name = customerName, City = data.CustomerCity.Trim() };
                    db.Customers.Add(customer);
                    customers[customerName] = customer;
                }

                var order = new Order
                {
                    Date = DateOnly.Parse(data.Date, CultureInfo.InvariantCulture),
                    Customer = customer
                };

                foreach (var (_, product, qty, price) in data.FilledSlots())
                {
                    order.Lines.Add(new OrderLine
                    {
                        ProductCode = product.Trim(),
                        Quantity = int.Parse(qty, CultureInfo.InvariantCulture),
                        UnitPrice = decimal.Parse(price, CultureInfo.InvariantCulture)
                    });
                }

                db.Orders.Add(order);
                row.Succeed();
            }
            catch (Exception ex)
            {
                row.Fail(ex.Message);
            }
        }

        return Task.CompletedTask;
    }
}
