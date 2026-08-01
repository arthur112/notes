namespace ExcelImport.Domain;

public class Product
{
    public int Id { get; set; }
    public required string Sku { get; set; }
    public List<StockLevel> StockLevels { get; set; } = [];
}
