namespace ExcelImport.Domain;

public class StockLevel
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public required string Warehouse { get; set; }
    public int OnHand { get; set; }
    public int ReorderLevel { get; set; }
}
