using Api.Auth;

namespace Api.Features.Customers;

public static class CustomerEndpoints
{
    public static RouteGroupBuilder MapCustomerEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/customers").WithTags("Customers");

        group.MapGet("", ListCustomers.Handle).RequireScope(Scopes.CustomersRead);
        group.MapGet("/options", ListCustomerOptions.Handle).RequireScope(Scopes.CustomersRead);

        return group;
    }
}
