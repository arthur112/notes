using Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Api.Features.Customers;

/// <summary>The customer pickers' options (the orders filter and form, the customers filter).</summary>
public static class ListCustomerOptions
{
    public record CustomerOption(string CustomerNo, string Name);

    public static Task<List<CustomerOption>> Handle(AppDbContext db, CancellationToken cancellationToken) =>
        db
            .Customers.OrderBy(c => c.Name)
            .Select(c => new CustomerOption(c.CustomerNo, c.Name))
            .ToListAsync(cancellationToken);
}
