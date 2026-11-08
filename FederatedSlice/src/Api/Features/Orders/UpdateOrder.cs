using Api.Data;
using Api.ErrorHandling;
using CSharpFunctionalExtensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using IResult = Microsoft.AspNetCore.Http.IResult;

namespace Api.Features.Orders;

public static class UpdateOrder
{
    public static async Task<IResult> Handle(
        string orderNo,
        OrderInput request,
        AppDbContext db,
        [FromServices] TimeProvider clock
    )
    {
        var result = await Maybe<OrderEntity>
            .From(
                await db
                    .Orders.Include(o => o.Lines)
                    .FirstOrDefaultAsync(o => o.OrderNo == orderNo)
            )
            .ToResult((IHttpError)new NotFoundError())
            .Bind(order => OrderWrite.ApplyAsync(order, request, db, clock))
            .Tap(_ => db.SaveChangesAsync())
            .Map(order => order.ToDetail());

        return result.Match(
            onSuccess: response => (IResult)Results.Ok(response),
            onFailure: error => error.ToHttpResult()
        );
    }
}
