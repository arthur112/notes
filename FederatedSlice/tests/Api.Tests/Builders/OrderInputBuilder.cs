using Api.Features.Orders;

namespace Api.Tests.Builders;

public class OrderInputBuilder
{
    private readonly string _customer;
    private OrderStatus _status = OrderStatus.Pending;
    private string? _reference;
    private DateOnly? _dueDate = new(2026, 2, 1);
    private bool? _isUrgent = false;
    private List<OrderLine> _lines = [new("Anvil", 1, 10)];

    private OrderInputBuilder(string customer) => _customer = customer;

    /// <summary>Orders name their customer, as the order form does.</summary>
    public static OrderInputBuilder For(string customerName) => new(customerName);

    public OrderInputBuilder WithStatus(OrderStatus status)
    {
        _status = status;
        return this;
    }

    public OrderInputBuilder WithReference(string? reference)
    {
        _reference = reference;
        return this;
    }

    public OrderInputBuilder WithDueDate(DateOnly? dueDate)
    {
        _dueDate = dueDate;
        return this;
    }

    public OrderInputBuilder WithUrgent(bool? isUrgent = true)
    {
        _isUrgent = isUrgent;
        return this;
    }

    public OrderInputBuilder WithLines(params OrderLine[] lines)
    {
        _lines = [.. lines];
        return this;
    }

    public OrderInput Build() => new(_customer, _status, _dueDate, _reference, _isUrgent, _lines);
}
