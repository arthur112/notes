using Api.Data;
using Api.ErrorHandling;
using CSharpFunctionalExtensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        var result = await BuildAsync(request, db, clock)
            .Tap(order => db.Orders.Add(order))
            .Tap(_ => db.SaveChangesAsync())
            .Map(order => order.ToDetail());

        return result.Match(
            onSuccess: response =>
                (IResult)Results.Created($"/api/orders/{response.OrderNo}", response),
            onFailure: error => error.ToHttpResult()
        );
    }

    /// <summary>
    /// The create write path: resolve the customer, map 1:1 (<see cref="OrderMapper"/>), then run
    /// the create rules (<see cref="OrderRules"/>), which may overwrite what was mapped. The
    /// attributes on <see cref="OrderInput"/> have already run (400 before the handler); the checks
    /// here need the database, and the reference check runs on the reference the rules left.
    /// </summary>
    private static async Task<Result<OrderEntity, IHttpError>> BuildAsync(
        OrderInput input,
        AppDbContext db,
        TimeProvider clock
    )
    {
        var customer = await db
            .Customers.Include(c => c.Settings)
            .FirstOrDefaultAsync(c => c.Name == input.Customer);
        if (customer is null)
            return Result.Failure<OrderEntity, IHttpError>(
                new ValidationError("customer", "Unknown customer.")
            );

        var errors = new Dictionary<string, string[]>();
        if (customer.IsOnHold)
            errors["customer"] = [$"{customer.Name} is on credit hold."];

        var order = new OrderEntity();
        order.MapFrom(input, customer);
        OrderRules.Run(
            new RuleContext(order, Original: null, customer, DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime))
        );

        if (order.Reference is { } reference && await db.Orders.AnyAsync(o => o.Reference == reference))
            errors["reference"] = ["Already used on another order"];

        return errors.Count == 0
            ? Result.Success<OrderEntity, IHttpError>(order)
            : Result.Failure<OrderEntity, IHttpError>(new ValidationError(errors));
    }
}
