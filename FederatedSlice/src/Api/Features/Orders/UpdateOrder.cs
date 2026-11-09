using Api.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Features.Orders;

public static class UpdateOrder
{
    public static async Task<Results<Ok<OrderDetail>, NotFound, ValidationProblem>> Handle(
        string orderNo,
        OrderInput request,
        AppDbContext db,
        [FromServices] TimeProvider clock
    )
    {
        var order = await db.Orders.Include(o => o.Lines).FirstOrDefaultAsync(o => o.OrderNo == orderNo);
        if (order is null)
            return TypedResults.NotFound();

        var errors = await ApplyAsync(order, request, db, clock);
        if (errors.Count > 0)
            return TypedResults.ValidationProblem(errors);

        await db.SaveChangesAsync();
        return TypedResults.Ok(order.ToDetail());
    }

    /// <summary>
    /// The update write path: resolve the customer, snapshot the stored values, map 1:1
    /// (<see cref="OrderMapper"/>), then run the update rules (<see cref="OrderRules"/>), which may
    /// overwrite what was mapped. The attributes on <see cref="OrderInput"/> have already run (400
    /// before the handler); the checks here need the database, and the reference check runs on the
    /// reference the rules left. Returns the field errors, empty when the order can be saved.
    /// </summary>
    private static async Task<Dictionary<string, string[]>> ApplyAsync(
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
            return new() { ["customer"] = ["Unknown customer."] };

        var errors = new Dictionary<string, string[]>();
        if (customer.IsOnHold)
            errors["customer"] = [$"{customer.Name} is on credit hold."];

        // The values as loaded, taken before the mapper overwrites them: what OnChange rules compare against.
        var original = (OrderEntity)db.Entry(order).OriginalValues.ToObject();
        order.MapFrom(input, customer);
        OrderRules.Run(
            new RuleContext(order, original, customer, DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime))
        );

        if (
            order.Reference is { } reference
            && await db.Orders.AnyAsync(o => o.Reference == reference && o.Id != order.Id)
        )
            errors["reference"] = ["Already used on another order"];

        return errors;
    }
}
