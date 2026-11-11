using System.Globalization;
using System.Linq.Expressions;
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
        Receivable Receivable,
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

    /// <summary>Everything the page computes from, read in one query (<see cref="Projection"/>). No entity past this point.</summary>
    /// <param name="OpenExposure">The total of the customer's unpaid (Pending) orders, this one included.</param>
    public record OrderFacts(
        string OrderNo,
        OrderStatus Status,
        string? Reference,
        DateOnly CreatedAt,
        DateOnly DueDate,
        OrderLine[] Lines,
        decimal Total,
        CustomerFacts Customer,
        decimal OpenExposure
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

    /// <summary>
    /// What the order still owes as of today: two figures always there, four only once it is late.
    /// Mirrors a loan-insurance contract's current state: remaining term ≈ DRAC (durée restant à
    /// courir), scheduled balance ≈ theoretical SDR, then arrears, interest, entry into risk and
    /// provision, each null until it exists.
    /// </summary>
    /// <param name="RemainingDays">Days left to the due date, 0 once it is reached.</param>
    /// <param name="ScheduledBalance">What the schedule says is owed: the total while Pending, else 0.</param>
    /// <param name="Overdue">The unpaid total once past due.</param>
    /// <param name="LateInterest">Simple interest on <paramref name="Overdue"/> at <see cref="LateInterestRate"/> a year.</param>
    /// <param name="AtRiskSince">The first day past <see cref="RiskThresholdDays"/> days late.</param>
    /// <param name="Provision">The share of <paramref name="Overdue"/> set aside once at risk.</param>
    public record Receivable(
        int RemainingDays,
        decimal ScheduledBalance,
        decimal? Overdue,
        decimal? LateInterest,
        DateOnly? AtRiskSince,
        decimal? Provision
    );

    private const decimal LateInterestRate = 0.12m;
    private const int RiskThresholdDays = 30;

    /// <summary>Provision rate by days past due, once at risk: a quarter, a half, then all of it.</summary>
    private static readonly (int MinDays, decimal Rate)[] ProvisionRates = [(91, 1m), (61, 0.5m), (0, 0.25m)];

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
        var facts = await db
            .Orders.Where(o => o.OrderNo == orderNo)
            .Select(Projection(db))
            .FirstOrDefaultAsync();
        if (facts is null)
            return TypedResults.NotFound();

        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        return TypedResults.Ok(ToOverview(facts, today));
    }

    /// <summary>
    /// The one query the page reads: columns, lines and both sums, in a single round trip. Only
    /// member access, <c>Sum</c>/<c>Count</c> and <c>new</c> of records in here: a call to one of
    /// our own methods would make EF fetch whole entities and run it in memory. Takes
    /// <paramref name="db"/> for the exposure subquery, since a customer has no <c>Orders</c>.
    /// </summary>
    public static Expression<Func<OrderEntity, OrderFacts>> Projection(AppDbContext db) =>
        o => new OrderFacts(
            o.OrderNo,
            o.Status,
            o.Reference,
            o.CreatedAt,
            o.DueDate,
            o.Lines.Select(l => new OrderLine(l.Product, l.Quantity, l.UnitPrice)).ToArray(),
            o.Lines.Sum(l => l.Quantity * l.UnitPrice),
            new CustomerFacts(
                o.Customer.CustomerNo,
                o.Customer.Name,
                o.Customer.Email,
                o.Customer.Segment,
                o.Customer.Country,
                o.Customer.Active,
                o.Customer.IsVerified,
                o.Customer.IsVip,
                o.Customer.IsOnHold,
                o.Customer.CreditLimit,
                o.Customer.PaymentTermsDays,
                o.Customer.CreatedAt,
                o.Customer.Settings!.InitialStatus,
                o.Customer.Settings.ForcedDueDays
            ),
            // SelectMany, not Sum(p => p.Lines.Sum(…)): SQL Server can't aggregate over a subquery.
            db.Orders.Where(p => p.CustomerId == o.CustomerId && p.Status == OrderStatus.Pending)
                .SelectMany(p => p.Lines)
                .Sum(l => l.Quantity * l.UnitPrice)
        );

    private static OrderOverview ToOverview(OrderFacts f, DateOnly today)
    {
        var risk = Assess(f, today);
        return new(
            f.OrderNo,
            f.Status,
            f.Reference,
            f.CreatedAt,
            f.DueDate,
            f.Lines,
            f.Total,
            f.Customer,
            risk,
            Value(f.Customer, f.Total, today),
            Owed(f, risk.DaysPastDue, today),
            today
        );
    }

    /// <summary>
    /// Points per risk factor, summed and capped at F. A credit hold alone is a D; a clean,
    /// verified, active customer within its terms is an A.
    /// </summary>
    public static RiskAssessment Assess(OrderFacts order, DateOnly today)
    {
        var customer = order.Customer;
        var daysPastDue =
            order.Status == OrderStatus.Pending ? Math.Max(0, today.DayNumber - order.DueDate.DayNumber) : 0;
        var creditUsedPct =
            customer.CreditLimit > 0 ? Math.Round(order.OpenExposure / customer.CreditLimit * 100, 1) : 100m;

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
            order.OpenExposure,
            creditUsedPct
        );
    }

    /// <summary>
    /// What the order is worth, from inputs <see cref="Assess"/> never reads, so the two move
    /// independently: a risky order can be valuable, a safe one worth little. Four parts that add up
    /// to at most 100: order size and payment terms up to 30 each, tenure and VIP up to 20 each.
    /// </summary>
    public static ValueScore Value(CustomerFacts customer, decimal total, DateOnly today)
    {
        var terms = customer.PaymentTermsDays;
        var years = (today.DayNumber - customer.Since.DayNumber) / 365;
        (int Points, string Driver)[] parts =
        [
            (total >= 1_000 ? 30 : total >= 250 ? 20 : total >= 50 ? 10 : 0, $"Order of {total.ToString("N2", CultureInfo.InvariantCulture)}"),
            (terms <= 15 ? 30 : terms <= 30 ? 20 : terms <= 60 ? 10 : 0, $"{terms}-day terms"),
            (Math.Min(years, 5) * 4, $"Customer since {customer.Since.Year}"),
            (customer.IsVip ? 20 : 0, "VIP"),
        ];
        var hits = parts.Where(p => p.Points > 0).OrderByDescending(p => p.Points).ToArray();
        var score = hits.Sum(p => p.Points);

        return new(score, ValueBands.First(b => score >= b.Min).Band, [.. hits.Select(p => p.Driver)]);
    }

    /// <summary>
    /// <paramref name="daysPastDue"/> comes from <see cref="Assess"/>: 0 unless the order is
    /// Pending after its due date, so a settled order never shows arrears.
    /// </summary>
    public static Receivable Owed(OrderFacts order, int daysPastDue, DateOnly today)
    {
        var total = order.Total;
        var overdue = daysPastDue > 0 ? total : (decimal?)null;
        var atRisk = daysPastDue > RiskThresholdDays;
        return new(
            Math.Max(0, order.DueDate.DayNumber - today.DayNumber),
            order.Status == OrderStatus.Pending ? total : 0,
            overdue,
            overdue is { } o ? Math.Round(o * LateInterestRate * daysPastDue / 365, 2) : null,
            atRisk ? order.DueDate.AddDays(RiskThresholdDays + 1) : null,
            atRisk ? Math.Round(total * ProvisionRates.First(r => daysPastDue >= r.MinDays).Rate, 2) : null
        );
    }
}
