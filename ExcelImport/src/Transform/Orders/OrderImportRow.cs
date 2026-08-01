namespace ExcelImport.Transform.Orders;

public class OrderImportRow
{
    public string Date { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerCity { get; set; } = string.Empty;
    public string Product1 { get; set; } = string.Empty;
    public string Qty1 { get; set; } = string.Empty;
    public string Price1 { get; set; } = string.Empty;
    public string Product2 { get; set; } = string.Empty;
    public string Qty2 { get; set; } = string.Empty;
    public string Price2 { get; set; } = string.Empty;
    public string Product3 { get; set; } = string.Empty;
    public string Qty3 { get; set; } = string.Empty;
    public string Price3 { get; set; } = string.Empty;

    public IEnumerable<(int Slot, string Product, string Qty, string Price)> Slots()
    {
        yield return (1, Product1, Qty1, Price1);
        yield return (2, Product2, Qty2, Price2);
        yield return (3, Product3, Qty3, Price3);
    }

    public IEnumerable<(int Slot, string Product, string Qty, string Price)> FilledSlots() =>
        Slots().Where(s => !IsEmpty(s.Product, s.Qty, s.Price));

    public static bool IsEmpty(string product, string qty, string price) =>
        string.IsNullOrWhiteSpace(product) && string.IsNullOrWhiteSpace(qty) && string.IsNullOrWhiteSpace(price);
}
