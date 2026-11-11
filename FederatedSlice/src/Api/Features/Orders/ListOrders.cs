using Api.Data;
using Api.Querying;
using Gridify;
using Microsoft.AspNetCore.Mvc;

namespace Api.Features.Orders;

public static class ListOrders
{
    /// <summary>The front's <c>Order</c> row (web/src/api/orders.ts).</summary>
    public record OrderRow(
        string OrderNo,
        string Customer,
        OrderStatus Status,
        decimal Total,
        DateOnly CreatedAt
    );

    /// <summary>
    /// What <c>filter</c> / <c>orderBy</c> may name: the field names of the front's orders filter
    /// (web/src/domains/orders/filter.ts) → the entity paths they stand for. Anything else is a
    /// 400. <c>lineCount</c> and <c>total</c> are computed, so they filter and sort in SQL.
    /// </summary>
    private static readonly IGridifyMapper<OrderEntity> Mapper = new GridifyMapper<OrderEntity>()
        .AddMap("orderNo", o => o.OrderNo)
        .AddMap("customer.name", o => o.Customer.Name)
        .AddMap("customer.customerNo", o => o.Customer.CustomerNo)
        // The front's flags multi-select: every flag is a boolean field, wherever its column is
        // and whatever its type. A nullable column becomes "is set".
        .AddMap("isUrgent", o => o.IsUrgent)
        .AddMap("isInvoiced", o => o.InvoicedAt != null)
        .AddMap("customer.isOnHold", o => o.Customer.IsOnHold)
        .AddMap("customer.hasFixedDueDate", o => o.Customer.Settings!.ForcedDueDays != null)
        .AddMap("status", o => o.Status)
        .AddMap("lineCount", o => o.Lines.Count)
        .AddMap("total", o => o.Lines.Sum(l => l.Quantity * l.UnitPrice))
        .AddMap("createdAt", o => o.CreatedAt, UtcDay.Parse);

    public static Task<PagedResult<OrderRow>> Handle(
        [AsParameters] ListQuery query,
        AppDbContext db,
        CancellationToken cancellationToken
    ) =>
        db
            .Orders.OrderByDescending(o => o.Id)
            .ToPagedResultAsync(
                query,
                Mapper,
                o => new OrderRow(
                    o.OrderNo,
                    o.Customer.Name,
                    o.Status,
                    o.Lines.Sum(l => l.Quantity * l.UnitPrice),
                    o.CreatedAt
                ),
                cancellationToken
            );
}
