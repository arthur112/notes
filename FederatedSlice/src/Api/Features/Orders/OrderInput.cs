using System.ComponentModel.DataAnnotations;

namespace Api.Features.Orders;

/// <summary>
/// What <c>POST /api/orders</c> and <c>PUT /api/orders/{orderNo}</c> accept: the front's
/// <c>OrderInput</c> (web/src/api/orders.ts). One record for both writes, since the order form
/// sends the same payload either way; PUT is a full replacement, lines included.
/// </summary>
public record OrderInput(
    [property: Required, MaxLength(200)] string Customer,
    OrderStatus Status,
    // Nullable so that a missing value fails [Required] instead of binding as 0001-01-01.
    [property: Required] DateOnly? DueDate,
    [property: MaxLength(50)] string? Reference,
    // Nullable for the same reason: a client that leaves it out gets a 400, not an order silently un-flagged.
    [property: Required] bool? IsUrgent,
    [property: Required, MinLength(1, ErrorMessage = "Add at least one line")] List<OrderLine> Lines
);

public record OrderLine(
    [property: Required, MaxLength(200)] string Product,
    [property: Range(1, int.MaxValue, ErrorMessage = "At least 1")] int Quantity,
    [property: Range(0, double.MaxValue, ErrorMessage = "Can't be negative")] decimal UnitPrice
);
