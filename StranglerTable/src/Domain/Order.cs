namespace StranglerTable.Domain;

public class Order
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = "";
    public DateTime OrderDate { get; set; }
    public OrderStatus Status { get; set; }
    public string Channel { get; set; } = "";
    public string Currency { get; set; } = "";
    public decimal SubTotal { get; set; }
    public decimal Tax { get; set; }
    public decimal ShippingCost { get; set; }
    public string? Notes { get; set; }
    public bool IsGift { get; set; }
    public bool NewsletterOptIn { get; set; }
    public Customer Customer { get; set; } = new();
    public Address BillingAddress { get; set; } = new();
    public Address ShippingAddress { get; set; } = new();
    public Fulfillment Fulfillment { get; set; } = new();
    public Audit Audit { get; set; } = new();

    public decimal Total => SubTotal + Tax + ShippingCost;
}

public enum OrderStatus
{
    Draft,
    Placed,
    Paid,
    Shipped,
    Delivered,
    Cancelled
}
