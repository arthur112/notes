using Api.Data;
using CSharpFunctionalExtensions;
using Microsoft.AspNetCore.Mvc;
using IResult = Microsoft.AspNetCore.Http.IResult;

namespace Api.Features.Orders;

public static class CreateOrder
{
    public static async Task<IResult> Handle(
        OrderInput request,
        AppDbContext db,
        [FromServices] TimeProvider clock
    )
    {
        var result = await OrderWrite
            .ApplyAsync(new OrderEntity(), request, db, clock)
            .Tap(order => db.Orders.Add(order))
            .Tap(_ => db.SaveChangesAsync())
            .Map(order => order.ToDetail());

        return result.Match(
            onSuccess: response =>
                (IResult)Results.Created($"/api/orders/{response.OrderNo}", response),
            onFailure: error => error.ToHttpResult()
        );
    }
}
