using Api.Features.Customers;
using Api.Features.Orders;

namespace Api.Tests.Builders;

public class OrderEntityBuilder
{
    private readonly int _customerId;
    private OrderStatus _status = OrderStatus.Pending;
    private string? _reference;
    private bool _isUrgent;
    private DateOnly? _invoicedAt;
    private DateOnly _dueDate = new(2026, 2, 1);
    private DateOnly _createdAt;
    private readonly List<OrderLineEntity> _lines = [];

    // By id, not navigation: seeding the order must not insert the customer a second time.
    private OrderEntityBuilder(CustomerEntity customer) => _customerId = customer.Id;

    public static OrderEntityBuilder For(CustomerEntity customer) => new(customer);

    public OrderEntityBuilder WithStatus(OrderStatus status)
    {
        _status = status;
        return this;
    }

    public OrderEntityBuilder WithReference(string reference)
    {
        _reference = reference;
        return this;
    }

    public OrderEntityBuilder Urgent()
    {
        _isUrgent = true;
        return this;
    }

    public OrderEntityBuilder InvoicedOn(DateOnly invoicedAt)
    {
        _invoicedAt = invoicedAt;
        return this;
    }

    public OrderEntityBuilder WithDueDate(DateOnly dueDate)
    {
        _dueDate = dueDate;
        return this;
    }

    /// <summary>Unset, the database stamps today on insert.</summary>
    public OrderEntityBuilder WithCreatedAt(DateOnly createdAt)
    {
        _createdAt = createdAt;
        return this;
    }

    public OrderEntityBuilder WithLine(string product, int quantity, decimal unitPrice)
    {
        _lines.Add(new() { Product = product, Quantity = quantity, UnitPrice = unitPrice });
        return this;
    }

    public OrderEntity Build() =>
        new()
        {
            CustomerId = _customerId,
            Status = _status,
            DueDate = _dueDate,
            IsUrgent = _isUrgent,
            InvoicedAt = _invoicedAt,
            CreatedAt = _createdAt,
            Reference = _reference,
            Lines = _lines.Count > 0 ? _lines : [new() { Product = "Anvil", Quantity = 1, UnitPrice = 10 }],
        };
}
