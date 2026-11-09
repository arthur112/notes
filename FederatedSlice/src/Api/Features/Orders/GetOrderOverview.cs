using System.Globalization;
using Api.Data;
using Api.Features.Customers;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Features.Orders;

/// <summary>
/// The order's record page: the order, its customer, and a risk grade worked out from data the API
/// already holds. The edit form keeps <see cref="GetOrder"/>, whose shape is the form's payload.
/// </summary>
public static class GetOrderOverview
{
    public record OrderOverview(
        string OrderNo,
        OrderStatus Status,
        string? Reference,
        DateOnly CreatedAt,
        DateOnly DueDate,
        OrderLine[] Lines,
        decimal Total,
        CustomerFacts Customer,
        RiskAssessment Risk,
        ValueScore Value,
        DateOnly AsOf
    );

    public record CustomerFacts(
        string CustomerNo,
        string Name,
        string Email,
        Segment Segment,
        string Country,
        bool Active,
        bool IsVerified,
        bool IsVip,
        bool IsOnHold,
        decimal CreditLimit,
        int PaymentTermsDays,
        DateOnly Since,
        OrderStatus? InitialStatus,
        int? ForcedDueDays
    );

    /// <param name="GradeIndex">0 (A) to 5 (F): the front's scale position.</param>
    /// <param name="Factors">What raised the grade, worst first; empty for an A.</param>
    /// <param name="DaysPastDue">0 unless the order is unpaid (Pending) after its due date.</param>
    /// <param name="OpenExposure">The total of the customer's unpaid (Pending) orders, this one included.</param>
    public record RiskAssessment(
        string Grade,
        int GradeIndex,
        string Band,
        string[] Factors,
        int DaysPastDue,
        decimal OpenExposure,
        decimal CreditUsedPct
    );

    /// <param name="Score">0–100, higher is better.</param>
    /// <param name="Drivers">What earned points, biggest first; empty for a 0.</param>
    public record ValueScore(int Score, string Band, string[] Drivers);

    private static readonly string[] Bands = ["Minimal", "Low", "Moderate", "Elevated", "High", "Severe"];

    private static readonly (int Min, string Band)[] ValueBands =
    [
        (80, "Excellent"),
        (60, "Good"),
        (40, "Fair"),
        (0, "Poor"),
    ];

    public static async Task<Results<Ok<OrderOverview>, NotFound>> Handle(
        string orderNo,
        AppDbContext db,
        [FromServices] TimeProvider clock
    )
    {
        var order = await db
            .Orders.Include(o => o.Customer)
            .ThenInclude(c => c.Settings)
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.OrderNo == orderNo);
        if (order is null)
            return TypedResults.NotFound();

        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        return TypedResults.Ok(ToOverview(order, await OpenExposureAsync(db, order.CustomerId), today));
    }

    // SelectMany, not Sum(o => o.Lines.Sum(…)): SQL Server can't aggregate over a subquery.
    private static Task<decimal> OpenExposureAsync(AppDbContext db, int customerId) =>
        db
            .Orders.Where(o => o.CustomerId == customerId && o.Status == OrderStatus.Pending)
            .SelectMany(o => o.Lines)
            .SumAsync(l => l.Quantity * l.UnitPrice);

    /// <summary>Needs <see cref="OrderEntity.Customer"/> and <see cref="OrderEntity.Lines"/> loaded.</summary>
    private static OrderOverview ToOverview(OrderEntity order, decimal openExposure, DateOnly today)
    {
        var c = order.Customer;
        var total = order.Lines.Sum(l => l.Quantity * l.UnitPrice);
        return new(
            order.OrderNo,
            order.Status,
            order.Reference,
            order.CreatedAt,
            order.DueDate,
            [.. order.Lines.Select(l => new OrderLine(l.Product, l.Quantity, l.UnitPrice))],
            total,
            new(
                c.CustomerNo,
                c.Name,
                c.Email,
                c.Segment,
                c.Country,
                c.Active,
                c.IsVerified,
                c.IsVip,
                c.IsOnHold,
                c.CreditLimit,
                c.PaymentTermsDays,
                c.CreatedAt,
                c.Settings?.InitialStatus,
                c.Settings?.ForcedDueDays
            ),
            Assess(order, openExposure, today),
            Value(order.Customer, total, today),
            today
        );
    }

    /// <summary>
    /// Points per risk factor, summed and capped at F. A credit hold alone is a D; a clean,
    /// verified, active customer within its terms is an A.
    /// </summary>
    public static RiskAssessment Assess(OrderEntity order, decimal openExposure, DateOnly today)
    {
        var customer = order.Customer;
        var daysPastDue =
            order.Status == OrderStatus.Pending ? Math.Max(0, today.DayNumber - order.DueDate.DayNumber) : 0;
        var creditUsedPct =
            customer.CreditLimit > 0 ? Math.Round(openExposure / customer.CreditLimit * 100, 1) : 100m;

        (int Points, string Factor)[] checks =
        [
            (customer.IsOnHold ? 3 : 0, "On credit hold"),
            (daysPastDue > 30 ? 2 : daysPastDue > 0 ? 1 : 0, $"{daysPastDue} days past due"),
            (creditUsedPct >= 90 ? 2 : creditUsedPct >= 50 ? 1 : 0, $"{creditUsedPct}% of credit limit in use"),
            (customer.IsVerified ? 0 : 1, "Unverified customer"),
            (customer.Active ? 0 : 1, "Inactive customer"),
            (customer.Segment == Segment.Startup ? 1 : 0, "Startup segment"),
        ];
        var hits = checks.Where(c => c.Points > 0).OrderByDescending(c => c.Points).ToArray();
        var index = Math.Min(hits.Sum(c => c.Points), Bands.Length - 1);

        return new(
            ((char)('A' + index)).ToString(),
            index,
            Bands[index],
            [.. hits.Select(c => c.Factor)],
            daysPastDue,
            openExposure,
            creditUsedPct
        );
    }

    /// <summary>
    /// What the order is worth, from inputs <see cref="Assess"/> never reads, so the two move
    /// independently: a risky order can be valuable, a safe one worth little. Four parts that add up
    /// to at most 100: order size and payment terms up to 30 each, tenure and VIP up to 20 each.
    /// </summary>
    public static ValueScore Value(CustomerEntity customer, decimal total, DateOnly today)
    {
        var terms = customer.PaymentTermsDays;
        var years = (today.DayNumber - customer.CreatedAt.DayNumber) / 365;
        (int Points, string Driver)[] parts =
        [
            (total >= 1_000 ? 30 : total >= 250 ? 20 : total >= 50 ? 10 : 0, $"Order of {total.ToString("N2", CultureInfo.InvariantCulture)}"),
            (terms <= 15 ? 30 : terms <= 30 ? 20 : terms <= 60 ? 10 : 0, $"{terms}-day terms"),
            (Math.Min(years, 5) * 4, $"Customer since {customer.CreatedAt.Year}"),
            (customer.IsVip ? 20 : 0, "VIP"),
        ];
        var hits = parts.Where(p => p.Points > 0).OrderByDescending(p => p.Points).ToArray();
        var score = hits.Sum(p => p.Points);

        return new(score, ValueBands.First(b => score >= b.Min).Band, [.. hits.Select(p => p.Driver)]);
    }
}
