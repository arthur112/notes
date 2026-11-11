namespace Api.Features.Orders;

/// <summary>The full order, which the edit form starts from: the front's <c>OrderDetail</c>.</summary>
public record OrderDetail(
    string OrderNo,
    string Customer,
    OrderStatus Status,
    DateOnly DueDate,
    string? Reference,
    bool IsUrgent,
    OrderLine[] Lines,
    DateOnly CreatedAt
);
