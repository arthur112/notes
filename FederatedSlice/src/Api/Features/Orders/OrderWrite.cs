using Api.Data;
using Api.ErrorHandling;
using CSharpFunctionalExtensions;
using Microsoft.EntityFrameworkCore;

namespace Api.Features.Orders;

/// <summary>
/// The one write path create and update share: resolve the customer, map 1:1
/// (<see cref="OrderMapper"/>), then run the named rules (<see cref="OrderRules"/>), which may
/// overwrite what was mapped. No other code assigns order columns. The attributes on
/// <see cref="OrderInput"/> have already run (400 before the handler); the checks here need the
/// database, and the reference check runs on the reference the rules left.
/// </summary>
public static class OrderWrite
{
    public static async Task<Result<OrderEntity, IHttpError>> ApplyAsync(
        OrderEntity order,
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

        // The values as loaded, taken before the mapper overwrites them (null for a new order).
        var original = order.Id == 0 ? null : (OrderEntity)db.Entry(order).OriginalValues.ToObject();
        order.MapFrom(input, customer);
        OrderRules.Run(
            new RuleContext(order, original, customer, DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime))
        );

        if (
            order.Reference is { } reference
            && await db.Orders.AnyAsync(o => o.Reference == reference && o.Id != order.Id)
        )
            errors["reference"] = ["Already used on another order"];

        return errors.Count == 0
            ? Result.Success<OrderEntity, IHttpError>(order)
            : Result.Failure<OrderEntity, IHttpError>(new ValidationError(errors));
    }
}
