using Api.Auth;

namespace Api.Features.Orders;

public static class OrderEndpoints
{
    public static RouteGroupBuilder MapOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders").WithTags("Orders");

        group.MapGet("", ListOrders.Handle).RequireScope(Scopes.OrdersRead);
        // Scope: the app may write orders. Role: this user may. Both must hold.
        group
            .MapPost("", CreateOrder.Handle)
            .RequireScope(Scopes.OrdersWrite)
            .RequireAuthorization(policy => policy.RequireRole(Roles.OrderEditor));
        // A literal segment outranks {orderNo}, so this isn't read as an order number.
        group.MapGet("/reference-taken", IsReferenceTaken.Handle).RequireScope(Scopes.OrdersRead);
        group.MapGet("/{orderNo}", GetOrder.Handle).RequireScope(Scopes.OrdersRead);
        group
            .MapPut("/{orderNo}", UpdateOrder.Handle)
            .RequireScope(Scopes.OrdersWrite)
            .RequireAuthorization(policy => policy.RequireRole(Roles.OrderEditor));

        return group;
    }
}
