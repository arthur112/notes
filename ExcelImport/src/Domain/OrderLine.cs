namespace ExcelImport.Domain;

public class OrderLine
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public required string ProductCode { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
