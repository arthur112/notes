namespace Parallelism.Domain;

public sealed class Customer
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string City { get; set; }
    public required string Country { get; set; }
    public required string Email { get; set; }
    public List<Order> Orders { get; set; } = [];
}

public sealed class Order
{
    public long Id { get; set; }
    public int SourceRowNumber { get; set; }
    public DateOnly OrderDate { get; set; }
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public required string Channel { get; set; }
    public required string Currency { get; set; }
    public required string SalesRep { get; set; }
    public required string Region { get; set; }
    public required string Warehouse { get; set; }
    public required string ShipMethod { get; set; }
    public required string Priority { get; set; }
    public decimal Total { get; set; }
    public List<OrderLine> Lines { get; set; } = [];
}

public sealed class OrderLine
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public required string Sku { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Discount { get; set; }
}
