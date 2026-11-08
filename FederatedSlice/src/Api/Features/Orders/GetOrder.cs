using Api.Data;
using Api.ErrorHandling;
using CSharpFunctionalExtensions;
using Microsoft.EntityFrameworkCore;
using IResult = Microsoft.AspNetCore.Http.IResult;

namespace Api.Features.Orders;

public static class GetOrder
{
    public static async Task<IResult> Handle(string orderNo, AppDbContext db) =>
        Maybe<OrderEntity>
            .From(
                await db
                    .Orders.Include(o => o.Customer)
                    .Include(o => o.Lines)
                    .FirstOrDefaultAsync(o => o.OrderNo == orderNo)
            )
            .ToResult(new NotFoundError())
            .Map(order => order.ToDetail())
            .Match(
                onSuccess: response => (IResult)Results.Ok(response),
                onFailure: error => error.ToHttpResult()
            );
}
