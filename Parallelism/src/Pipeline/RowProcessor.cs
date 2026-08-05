using Parallelism.Domain;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Parallelism.Pipeline;

public static class RowProcessor
{
    private static int _rowNumber;

    public static StagedOrder Process(string[] values)
    {
        for (var i = 0; i < values.Length; i++)
        {
            values[i] = values[i].Trim();
        }

        if (!DateOnly.TryParse(values[0], CultureInfo.InvariantCulture, out _))
        {
            throw new InvalidDataException($"Invalid OrderDate '{values[0]}'.");
        }
        ValidateSlot(values, slotOffset: 10);
        if (values[15].Length > 0) ValidateSlot(values, slotOffset: 15);
        if (values[20].Length > 0) ValidateSlot(values, slotOffset: 20);

        return new StagedOrder
        {
            RowNumber = Interlocked.Increment(ref _rowNumber),
            OrderDate = values[0],
            CustomerName = values[1],
            CustomerCity = values[2],
            CustomerCountry = values[3],
            CustomerEmail = values[4],
            Channel = values[5],
            Currency = values[6],
            SalesRep = values[7],
            Region = values[8],
            Warehouse = values[9],
            Product1 = values[10], Sku1 = values[11], Qty1 = values[12], Price1 = values[13], Discount1 = values[14],
            Product2 = values[15], Sku2 = values[16], Qty2 = values[17], Price2 = values[18], Discount2 = values[19],
            Product3 = values[20], Sku3 = values[21], Qty3 = values[22], Price3 = values[23], Discount3 = values[24],
            ShipMethod = values[25],
            Priority = values[26],
            Notes = values[27],
            RowHash = Hash(values),
        };
    }

    private static void ValidateSlot(string[] values, int slotOffset)
    {
        if (!int.TryParse(values[slotOffset + 2], NumberStyles.Integer, CultureInfo.InvariantCulture, out var qty) || qty <= 0)
        {
            throw new InvalidDataException($"Invalid Qty '{values[slotOffset + 2]}' for SKU '{values[slotOffset + 1]}'.");
        }
        if (!decimal.TryParse(values[slotOffset + 3], NumberStyles.Number, CultureInfo.InvariantCulture, out var price) || price < 0)
        {
            throw new InvalidDataException($"Invalid Price '{values[slotOffset + 3]}' for SKU '{values[slotOffset + 1]}'.");
        }
        if (values[slotOffset + 4].Length > 0 &&
            !decimal.TryParse(values[slotOffset + 4], NumberStyles.Number, CultureInfo.InvariantCulture, out _))
        {
            throw new InvalidDataException($"Invalid Discount '{values[slotOffset + 4]}' for SKU '{values[slotOffset + 1]}'.");
        }
    }

    private static string Hash(string[] values)
    {
        var joined = string.Join('|', values);
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(joined)));
    }
}
