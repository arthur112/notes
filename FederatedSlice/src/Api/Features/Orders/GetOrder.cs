using Api.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace Api.Features.Orders;

public static class GetOrder
{
    public static async Task<Results<Ok<OrderDetail>, NotFound>> Handle(string orderNo, AppDbContext db)
    {
        var order = await db
            .Orders.Include(o => o.Customer)
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.OrderNo == orderNo);

        return order is null ? TypedResults.NotFound() : TypedResults.Ok(order.ToDetail());
    }
}
