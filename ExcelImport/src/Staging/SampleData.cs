using ClosedXML.Excel;
using System.Text;

namespace ExcelImport.Staging;

public static class SampleData
{
    private static readonly string[] OrderHeaders =
    [
        "Date", "CustomerName", "CustomerCity",
        "Product1", "Qty1", "Price1",
        "Product2", "Qty2", "Price2",
        "Product3", "Qty3", "Price3"
    ];

    private static readonly string[] InventoryHeaders =
    [
        "SKU", "Warehouse", "OnHand", "ReorderLevel"
    ];

    private static readonly (string Name, string City)[] Customers =
    [
        ("Contoso", "Lisbon"),
        ("Northwind", "Porto"),
        ("Fabrikam", "Madrid"),
        ("AdventureWorks", "Braga"),
        ("Tailspin", "Coimbra")
    ];

    private static readonly (string Code, string Price)[] Products =
    [
        ("A-100", "9.99"),
        ("B-200", "19.50"),
        ("C-300", "4.25"),
        ("D-400", "149.00"),
        ("E-500", "0.75")
    ];

    private static readonly string[] Warehouses = ["Lisbon", "Porto", "Madrid"];

    public static void GenerateOrders(string path, int rowCount) =>
        WriteXlsx(path, "Orders", OrderHeaders, OrderRows(rowCount));

    public static void GenerateOrdersCsv(string path, int rowCount) =>
        WriteCsv(path, OrderHeaders, OrderRows(rowCount));

    public static void GenerateInventory(string path, int rowCount) =>
        WriteXlsx(path, "Inventory", InventoryHeaders, InventoryRows(rowCount));

    public static void GenerateInventoryCsv(string path, int rowCount) =>
        WriteCsv(path, InventoryHeaders, InventoryRows(rowCount));

    private static IEnumerable<string[]> OrderRows(int rowCount)
    {
        for (var i = 0; i < rowCount; i++)
        {
            var (name, city) = Customers[i % Customers.Length];
            var row = new string[OrderHeaders.Length];
            Array.Fill(row, string.Empty);

            row[0] = i % 997 == 996
                ? "not-a-date"
                : new DateOnly(2026, 1, 1).AddDays(i % 60).ToString("yyyy-MM-dd");
            row[1] = name;
            row[2] = city;

            var lineCount = 1 + i % 3;
            FillSlot(row, 0, Products[i % Products.Length], 2 + i % 5);
            if (lineCount > 1)
            {
                FillSlot(row, 1, Products[(i + 1) % Products.Length], 1 + i % 3);
            }
            if (lineCount > 2)
            {
                FillSlot(row, 2, Products[(i + 2) % Products.Length], 1 + i % 4);
            }

            if (i % 1499 == 1498)
            {
                row[3] = string.Empty;
            }

            yield return row;
        }
    }

    private static IEnumerable<string[]> InventoryRows(int rowCount)
    {
        for (var i = 0; i < rowCount; i++)
        {
            yield return
            [
                Products[i % Products.Length].Code,
                Warehouses[i % Warehouses.Length],
                i % 883 == 882 ? "-3" : (i * 37 % 200).ToString(),
                (5 + i % 20).ToString()
            ];
        }
    }

    private static void FillSlot(string[] row, int slot, (string Code, string Price) product, int qty)
    {
        row[3 + slot * 3] = product.Code;
        row[4 + slot * 3] = qty.ToString();
        row[5 + slot * 3] = product.Price;
    }

    private static void WriteXlsx(string path, string sheetName, string[] headers, IEnumerable<string[]> rows)
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.AddWorksheet(sheetName);

        for (var i = 0; i < headers.Length; i++)
        {
            worksheet.Cell(1, i + 1).Value = headers[i];
        }

        var r = 2;
        foreach (var row in rows)
        {
            for (var c = 0; c < row.Length; c++)
            {
                worksheet.Cell(r, c + 1).Value = row[c];
            }
            r++;
        }

        workbook.SaveAs(path);
    }

    private static void WriteCsv(string path, string[] headers, IEnumerable<string[]> rows)
    {
        using var writer = new StreamWriter(path, append: false, Encoding.UTF8, bufferSize: 1 << 16);
        writer.WriteLine(string.Join(',', headers));
        foreach (var row in rows)
        {
            writer.WriteLine(string.Join(',', row));
        }
    }
}
