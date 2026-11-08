using Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Api.Features.Customers;

/// <summary>The customer pickers' options (the orders filter and form, the customers filter).</summary>
public static class ListCustomerOptions
{
    public record Response(string CustomerNo, string Name);

    public static Task<List<Response>> Handle(AppDbContext db, CancellationToken cancellationToken) =>
        db
            .Customers.OrderBy(c => c.Name)
            .Select(c => new Response(c.CustomerNo, c.Name))
            .ToListAsync(cancellationToken);
}
