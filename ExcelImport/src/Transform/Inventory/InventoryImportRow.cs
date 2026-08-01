namespace ExcelImport.Transform.Inventory;

public class InventoryImportRow
{
    public string Sku { get; set; } = string.Empty;
    public string Warehouse { get; set; } = string.Empty;
    public string OnHand { get; set; } = string.Empty;
    public string ReorderLevel { get; set; } = string.Empty;
}
