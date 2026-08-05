namespace Parallelism.Domain;

public sealed class StagedOrder
{
    public long Id { get; set; }
    public int RowNumber { get; set; }
    public required string OrderDate { get; set; }
    public required string CustomerName { get; set; }
    public required string CustomerCity { get; set; }
    public required string CustomerCountry { get; set; }
    public required string CustomerEmail { get; set; }
    public required string Channel { get; set; }
    public required string Currency { get; set; }
    public required string SalesRep { get; set; }
    public required string Region { get; set; }
    public required string Warehouse { get; set; }
    public required string Product1 { get; set; }
    public required string Sku1 { get; set; }
    public required string Qty1 { get; set; }
    public required string Price1 { get; set; }
    public required string Discount1 { get; set; }
    public required string Product2 { get; set; }
    public required string Sku2 { get; set; }
    public required string Qty2 { get; set; }
    public required string Price2 { get; set; }
    public required string Discount2 { get; set; }
    public required string Product3 { get; set; }
    public required string Sku3 { get; set; }
    public required string Qty3 { get; set; }
    public required string Price3 { get; set; }
    public required string Discount3 { get; set; }
    public required string ShipMethod { get; set; }
    public required string Priority { get; set; }
    public required string Notes { get; set; }
    public required string RowHash { get; set; }
}
