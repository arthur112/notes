using Api.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Features.Orders;

public static class CreateOrder
{
    public static async Task<Results<Created<OrderDetail>, ValidationProblem>> Handle(
        OrderInput request,
        AppDbContext db,
        [FromServices] TimeProvider clock
    )
    {
        var order = new OrderEntity();
        var errors = await ApplyAsync(order, request, db, clock);
        if (errors.Count > 0)
            return TypedResults.ValidationProblem(errors);

        db.Orders.Add(order);
        await db.SaveChangesAsync();
        var detail = order.ToDetail();
        return TypedResults.Created($"/api/orders/{detail.OrderNo}", detail);
    }

    /// <summary>
    /// The create write path: resolve the customer, map 1:1 (<see cref="OrderMapper"/>), then run
    /// the create rules (<see cref="OrderRules"/>), which may overwrite what was mapped. The
    /// attributes on <see cref="OrderInput"/> have already run (400 before the handler); the checks
    /// here need the database, and the reference check runs on the reference the rules left.
    /// Returns the field errors, empty when the order can be saved.
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

        order.MapFrom(input, customer);
        OrderRules.Run(
            new RuleContext(order, Original: null, customer, DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime))
        );

        if (order.Reference is { } reference && await db.Orders.AnyAsync(o => o.Reference == reference))
            errors["reference"] = ["Already used on another order"];

        return errors;
    }
}
