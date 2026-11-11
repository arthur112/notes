using System.Net;
using System.Net.Http.Json;
using Api.Auth;
using Api.Features.Customers;
using Api.Features.Orders;
using Api.Tests.Builders;
using Microsoft.EntityFrameworkCore;

namespace Api.Tests;

/// <summary>The computations on hand-built read models, then the projection and the endpoint against the database.</summary>
public class OrderOverviewTests : DatabaseTestBase
{
    private static readonly DateOnly Today = new(2026, 3, 1);

    /// <summary>Verified, active, SMB, 10,000 credit limit, 30-day terms, since 2025-01-01.</summary>
    private static readonly GetOrderOverview.CustomerFacts Clean = new(
        "CUS-1001",
        "Acme",
        "acme@example.com",
        Segment.SMB,
        "BE",
        Active: true,
        IsVerified: true,
        IsVip: false,
        IsOnHold: false,
        CreditLimit: 10_000,
        PaymentTermsDays: 30,
        Since: new(2025, 1, 1),
        InitialStatus: null,
        ForcedDueDays: null
    );

    /// <summary>A 1,000 Pending order due today, for <see cref="Clean"/>.</summary>
    private static readonly GetOrderOverview.OrderFacts Order = new(
        "ORD-100101",
        OrderStatus.Pending,
        Reference: null,
        CreatedAt: Today.AddDays(-30),
        DueDate: Today,
        Lines: [new("Anvil", 1, 1_000)],
        Total: 1_000,
        Clean,
        OpenExposure: 0,
        RelatedOrders: []
    );

    [Test]
    public async Task Clean_Customer_Within_Terms_Is_An_A()
    {
        var risk = GetOrderOverview.Assess(Order, Today);

        await Assert.That(risk.Grade).IsEqualTo("A");
        await Assert.That(risk.Band).IsEqualTo("Minimal");
        await Assert.That(risk.Factors).IsEmpty();
    }

    [Test]
    public async Task Factors_Add_Up_Worst_First()
    {
        // Hold (3) + 31 days late (2) + unverified (1) = 6, capped at F.
        var risk = GetOrderOverview.Assess(
            Order with { DueDate = Today.AddDays(-31), Customer = Clean with { IsOnHold = true, IsVerified = false } },
            Today
        );

        await Assert.That(risk.Grade).IsEqualTo("F");
        await Assert.That(risk.GradeIndex).IsEqualTo(5);
        await Assert.That(risk.DaysPastDue).IsEqualTo(31);
        await Assert
            .That(risk.Factors)
            .IsEquivalentTo(["On credit hold", "31 days past due", "Unverified customer"]);
    }

    [Test]
    public async Task A_Settled_Order_Is_Never_Past_Due()
    {
        var risk = GetOrderOverview.Assess(Order with { Status = OrderStatus.Paid, DueDate = Today.AddDays(-90) }, Today);

        await Assert.That(risk.DaysPastDue).IsEqualTo(0);
        await Assert.That(risk.Grade).IsEqualTo("A");
    }

    [Test]
    public async Task Exposure_Over_Half_The_Limit_Raises_The_Grade()
    {
        var risk = GetOrderOverview.Assess(Order with { OpenExposure = 6_000 }, Today);

        await Assert.That(risk.CreditUsedPct).IsEqualTo(60m);
        await Assert.That(risk.Grade).IsEqualTo("B");
    }

    [Test]
    public async Task Value_Ignores_What_The_Risk_Grade_Reads()
    {
        // Same order and customer, but on hold, unverified and a startup: the grade moves, the value doesn't.
        var risky = Clean with { IsOnHold = true, IsVerified = false, Segment = Segment.Startup };

        await Assert
            .That(GetOrderOverview.Value(risky, 300, Today))
            .IsEquivalentTo(GetOrderOverview.Value(Clean, 300, Today));
    }

    [Test]
    public async Task Value_Adds_Size_Terms_Tenure_And_Vip()
    {
        // 1,000+ order 30 + 30-day terms 20 + 1 full year (since 2025-01-01) 4 + VIP 20 = 74.
        var value = GetOrderOverview.Value(Clean with { IsVip = true }, 1_200, Today);

        await Assert.That(value.Score).IsEqualTo(74);
        await Assert.That(value.Band).IsEqualTo("Good");
        await Assert.That(value.Drivers[0]).IsEqualTo("Order of 1,200.00");
    }

    private static GetOrderOverview.Receivable Owed(int daysPastDue, OrderStatus status = OrderStatus.Pending) =>
        GetOrderOverview.Owed(
            Order with { Status = status, DueDate = Today.AddDays(-daysPastDue) },
            Math.Max(0, daysPastDue),
            Today
        );

    [Test]
    public async Task On_Time_Order_Owes_Only_Its_Schedule()
    {
        var owed = Owed(daysPastDue: -10);

        await Assert.That(owed.RemainingDays).IsEqualTo(10);
        await Assert.That(owed.ScheduledBalance).IsEqualTo(1_000m);
        await Assert.That(owed.Overdue).IsNull();
        await Assert.That(owed.LateInterest).IsNull();
        await Assert.That(owed.AtRiskSince).IsNull();
        await Assert.That(owed.Provision).IsNull();
    }

    [Test]
    public async Task Late_Order_Accrues_Interest_Before_It_Is_At_Risk()
    {
        // 1,000 × 12% × 30 / 365 = 9.86.
        var owed = Owed(daysPastDue: 30);

        await Assert.That(owed.RemainingDays).IsEqualTo(0);
        await Assert.That(owed.Overdue).IsEqualTo(1_000m);
        await Assert.That(owed.LateInterest).IsEqualTo(9.86m);
        await Assert.That(owed.AtRiskSince).IsNull();
        await Assert.That(owed.Provision).IsNull();
    }

    [Test]
    public async Task Past_30_Days_It_Is_At_Risk_And_Provisioned()
    {
        var owed = Owed(daysPastDue: 75);

        await Assert.That(owed.AtRiskSince).IsEqualTo(Today.AddDays(-75 + 31));
        await Assert.That(owed.Provision).IsEqualTo(500m);
    }

    [Test]
    public async Task Settled_Order_Owes_Nothing()
    {
        var owed = Owed(daysPastDue: 0, OrderStatus.Paid);

        await Assert.That(owed.ScheduledBalance).IsEqualTo(0m);
        await Assert.That(owed.Overdue).IsNull();
    }

    [Test]
    public async Task Overview_Sums_The_Customers_Unpaid_Orders()
    {
        var customer = await SeedAsync(CustomerEntityBuilder.Create().Verified().Build());
        var order = await SeedAsync(OrderEntityBuilder.For(customer).WithLine("Anvil", 3, 100).Build());
        await SeedAsync(OrderEntityBuilder.For(customer).WithLine("Hammock", 1, 50).Build());
        await SeedAsync(
            OrderEntityBuilder.For(customer).WithStatus(OrderStatus.Paid).WithLine("Stapler", 1, 999).Build()
        );

        var overview = await CreateClient(Scopes.OrdersRead)
            .GetFromJsonAsync<GetOrderOverview.OrderOverview>($"/api/orders/{order.OrderNo}/overview");

        await Assert.That(overview!.Total).IsEqualTo(300m);
        await Assert.That(overview.Customer.CustomerNo).IsEqualTo(customer.CustomerNo);
        await Assert.That(overview.Risk.OpenExposure).IsEqualTo(350m);
    }

    [Test]
    public async Task Overview_Links_The_Customers_Other_Orders_Newest_First()
    {
        var customer = await SeedAsync(CustomerEntityBuilder.Create().Build());
        var order = await SeedAsync(OrderEntityBuilder.For(customer).WithLine("Anvil", 1, 100).Build());
        var older = await SeedAsync(
            OrderEntityBuilder.For(customer).WithCreatedAt(new(2026, 1, 1)).WithLine("Hammock", 2, 25).Build()
        );
        var newer = await SeedAsync(
            OrderEntityBuilder.For(customer).WithCreatedAt(new(2026, 2, 1)).WithLine("Stapler", 1, 10).Build()
        );
        var stranger = await SeedAsync(CustomerEntityBuilder.Create().Build());
        await SeedAsync(OrderEntityBuilder.For(stranger).WithLine("Anvil", 1, 100).Build());

        var overview = await CreateClient(Scopes.OrdersRead)
            .GetFromJsonAsync<GetOrderOverview.OrderOverview>($"/api/orders/{order.OrderNo}/overview");

        await Assert
            .That(overview!.RelatedOrders.Select(r => r.OrderNo))
            .IsEquivalentTo([newer.OrderNo, older.OrderNo]);
        await Assert.That(overview.RelatedOrders[1].Total).IsEqualTo(50m);
    }

    [Test]
    public async Task Projection_Translates_To_Sql()
    {
        await using var db = CreateDbContext();

        // Throws if any part of the projection can't become SQL.
        var sql = db.Orders.Select(GetOrderOverview.Projection(db)).ToQueryString();

        await Assert.That(sql).Contains("SUM");
    }

    [Test]
    public async Task Unknown_Order_Is_A_404()
    {
        var response = await CreateClient(Scopes.OrdersRead).GetAsync("/api/orders/ORD-999999/overview");

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.NotFound);
    }
}
