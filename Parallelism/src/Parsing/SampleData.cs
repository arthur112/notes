using System.Text;

namespace Parallelism.Parsing;

public static class SampleData
{
    public const string Header =
        "OrderDate,CustomerName,CustomerCity,CustomerCountry,CustomerEmail," +
        "Channel,Currency,SalesRep,Region,Warehouse," +
        "Product1,Sku1,Qty1,Price1,Discount1," +
        "Product2,Sku2,Qty2,Price2,Discount2," +
        "Product3,Sku3,Qty3,Price3,Discount3," +
        "ShipMethod,Priority,Notes";

    private static readonly (string Name, string City, string Country)[] Customers =
    [
        ("Acme Corp", "Oslo", "Norway"),
        ("Globex", "Bergen", "Norway"),
        ("Initech", "Stockholm", "Sweden"),
        ("Umbrella", "Copenhagen", "Denmark"),
        ("Hooli", "Helsinki", "Finland"),
        ("Stark Industries", "Malmo", "Sweden"),
        ("Wayne Enterprises", "Gothenburg", "Sweden"),
        ("Cyberdyne", "Trondheim", "Norway"),
        ("Soylent", "Aarhus", "Denmark"),
        ("Tyrell Corp", "Uppsala", "Sweden"),
        ("Wonka Inc", "Lund", "Sweden"),
        ("Aperture Labs", "Stavanger", "Norway"),
    ];

    private static readonly string[] Channels = ["Web", "Retail", "Partner", "Phone"];
    private static readonly string[] Currencies = ["NOK", "SEK", "DKK", "EUR"];
    private static readonly string[] Reps = ["a.johansen", "m.lindqvist", "s.nielsen", "kvirtanen", "p.olsen", "j.holm"];
    private static readonly string[] Regions = ["North", "South", "East", "West", "Central"];
    private static readonly string[] Warehouses = ["OSL-1", "STO-2", "CPH-1", "HEL-3", "BGO-1"];
    private static readonly string[] ShipMethods = ["Truck", "Air", "Sea", "Rail", "Courier"];
    private static readonly string[] Priorities = ["Low", "Normal", "High", "Critical"];
    private static readonly (string Product, string Sku)[] Products =
    [
        ("Widget", "W-100"), ("Gadget", "G-200"), ("Doohickey", "D-300"), ("Thingamajig", "T-400"),
        ("Sprocket", "S-500"), ("Gizmo", "G-600"), ("Contraption", "C-700"), ("Apparatus", "A-800"),
        ("Mechanism", "M-900"), ("Device", "D-110"), ("Unit", "U-120"), ("Module", "M-130"),
    ];

    public static void Generate(string path, int rows, int seed = 42)
    {
        var random = new Random(seed);
        using var writer = new StreamWriter(path, append: false, Encoding.UTF8, bufferSize: 1 << 16);
        writer.WriteLine(Header);

        var line = new StringBuilder(256);
        for (var i = 0; i < rows; i++)
        {
            var customer = Customers[random.Next(Customers.Length)];
            var slots = 1 + random.Next(3);

            line.Clear();
            line.Append("2026-").Append(random.Next(1, 8).ToString("D2")).Append('-').Append(random.Next(1, 29).ToString("D2")).Append(',');
            line.Append(customer.Name).Append(',');
            line.Append(customer.City).Append(',');
            line.Append(customer.Country).Append(',');
            line.Append(customer.Name.Replace(" ", "").ToLowerInvariant()).Append(random.Next(1000)).Append("@example.com,");
            line.Append(Channels[random.Next(Channels.Length)]).Append(',');
            line.Append(Currencies[random.Next(Currencies.Length)]).Append(',');
            line.Append(Reps[random.Next(Reps.Length)]).Append(',');
            line.Append(Regions[random.Next(Regions.Length)]).Append(',');
            line.Append(Warehouses[random.Next(Warehouses.Length)]).Append(',');

            for (var slot = 1; slot <= 3; slot++)
            {
                if (slot <= slots)
                {
                    var product = Products[random.Next(Products.Length)];
                    line.Append(product.Product).Append(',');
                    line.Append(product.Sku).Append(',');
                    line.Append(random.Next(1, 50)).Append(',');
                    line.Append((random.Next(100, 10000) / 100m).ToString("F2", System.Globalization.CultureInfo.InvariantCulture)).Append(',');
                    line.Append((random.Next(0, 2000) / 100m).ToString("F2", System.Globalization.CultureInfo.InvariantCulture));
                }
                else
                {
                    line.Append(",,,,");
                }
                line.Append(',');
            }

            line.Append(ShipMethods[random.Next(ShipMethods.Length)]).Append(',');
            line.Append(Priorities[random.Next(Priorities.Length)]).Append(',');
            line.Append("order-").Append(i);

            writer.WriteLine(line);
        }
    }
}
