using Api.Data;
using Api.Features.Orders;
using Api.Querying;
using Gridify;
using Microsoft.AspNetCore.Mvc;

namespace Api.Features.Customers;

public static class ListCustomers
{
    /// <summary>
    /// The front's <c>Customer</c> (web/src/api/customers.ts), with the customer's order settings,
    /// shown read-only so a rejected save can be traced to its rule.
    /// </summary>
    public record Response(
        string CustomerNo,
        string Name,
        string Email,
        Segment Segment,
        string Country,
        bool Active,
        decimal CreditLimit,
        int PaymentTermsDays,
        bool IsVip,
        bool IsVerified,
        bool IsOnHold,
        DateOnly CreatedAt,
        OrderStatus? InitialStatus,
        int? ForcedDueDays
    );

    /// <summary>
    /// What <c>filter</c> / <c>orderBy</c> may name. The front's customers filter
    /// (web/src/domains/customers/filter.ts) uses the entity's own property names, so the
    /// generated mappings fit; only the day range needs its converter.
    /// </summary>
    private static readonly IGridifyMapper<CustomerEntity> Mapper = new GridifyMapper<CustomerEntity>(
        autoGenerateMappings: true
    ).AddMap("createdAt", c => c.CreatedAt, UtcDay.Parse);

    public static async Task<IResult> Handle(
        [AsParameters] ListQuery query,
        AppDbContext db,
        CancellationToken cancellationToken
    ) =>
        Results.Ok(
            await db
                .Customers.OrderBy(c => c.Id)
                .ToPagedResultAsync(
                    query,
                    Mapper,
                    c => new Response(
                        c.CustomerNo,
                        c.Name,
                        c.Email,
                        c.Segment,
                        c.Country,
                        c.Active,
                        c.CreditLimit,
                        c.PaymentTermsDays,
                        c.IsVip,
                        c.IsVerified,
                        c.IsOnHold,
                        c.CreatedAt,
                        c.Settings == null ? null : c.Settings.InitialStatus,
                        c.Settings == null ? null : c.Settings.ForcedDueDays
                    ),
                    cancellationToken
                )
        );
}
