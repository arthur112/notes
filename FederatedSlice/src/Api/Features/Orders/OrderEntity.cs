using Api.Features.Customers;

namespace Api.Features.Orders;

public class OrderEntity
{
    public int Id { get; set; }

    /// <summary>Computed by the database from <see cref="Id"/> (<c>ORD-100101</c>).</summary>
    public string OrderNo { get; private set; } = "";
    public int CustomerId { get; set; }
    public CustomerEntity Customer { get; set; } = null!;
    public OrderStatus Status { get; set; }
    public DateOnly DueDate { get; set; }

    /// <summary>The customer's purchase-order number; unique across orders.</summary>
    public string? Reference { get; set; }

    /// <summary>Defaults to today in the database; set it to back-date an order.</summary>
    public DateOnly CreatedAt { get; set; }
    public List<OrderLineEntity> Lines { get; set; } = [];
}

public class OrderLineEntity
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public required string Product { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
