using System.Net;
using System.Net.Http.Json;
using Api.Auth;
using Api.Features.Customers;
using Api.Features.Orders;
using Api.Tests.Builders;

namespace Api.Tests;

/// <summary>The risk grading on hand-built entities, then the endpoint against the database.</summary>
public class OrderOverviewTests : DatabaseTestBase
{
    private static readonly DateOnly Today = new(2026, 3, 1);

    private static GetOrderOverview.RiskAssessment Assess(
        CustomerEntityBuilder customer,
        OrderStatus status = OrderStatus.Pending,
        DateOnly? dueDate = null,
        decimal openExposure = 0
    )
    {
        var c = customer.WithId(1001).Build();
        var order = OrderEntityBuilder.For(c).WithStatus(status).WithDueDate(dueDate ?? Today).Build();
        order.Customer = c;
        return GetOrderOverview.Assess(order, openExposure, Today);
    }

    [Test]
    public async Task Clean_Customer_Within_Terms_Is_An_A()
    {
        var risk = Assess(CustomerEntityBuilder.Create().Verified());

        await Assert.That(risk.Grade).IsEqualTo("A");
        await Assert.That(risk.Band).IsEqualTo("Minimal");
        await Assert.That(risk.Factors).IsEmpty();
    }

    [Test]
    public async Task Factors_Add_Up_Worst_First()
    {
        // Hold (3) + 31 days late (2) + unverified (1) = 6, capped at F.
        var risk = Assess(CustomerEntityBuilder.Create().OnHold(), dueDate: Today.AddDays(-31));

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
        var risk = Assess(CustomerEntityBuilder.Create().Verified(), OrderStatus.Paid, Today.AddDays(-90));

        await Assert.That(risk.DaysPastDue).IsEqualTo(0);
        await Assert.That(risk.Grade).IsEqualTo("A");
    }

    [Test]
    public async Task Exposure_Over_Half_The_Limit_Raises_The_Grade()
    {
        // The builder's credit limit is 10,000.
        var risk = Assess(CustomerEntityBuilder.Create().Verified(), openExposure: 6_000);

        await Assert.That(risk.CreditUsedPct).IsEqualTo(60m);
        await Assert.That(risk.Grade).IsEqualTo("B");
    }

    [Test]
    public async Task Value_Ignores_What_The_Risk_Grade_Reads()
    {
        // Same order and customer, but on hold, unverified and a startup: the grade moves, the value doesn't.
        var clean = CustomerEntityBuilder.Create().Verified().Build();
        var risky = CustomerEntityBuilder.Create().OnHold().WithSegment(Segment.Startup).Build();

        await Assert
            .That(GetOrderOverview.Value(risky, 300, Today))
            .IsEquivalentTo(GetOrderOverview.Value(clean, 300, Today));
    }

    [Test]
    public async Task Value_Adds_Size_Terms_Tenure_And_Vip()
    {
        // 1,000+ order 30 + 30-day terms 20 + 1 full year (builder: since 2025-01-01) 4 + VIP 20 = 74.
        var value = GetOrderOverview.Value(CustomerEntityBuilder.Create().Vip().Build(), 1_200, Today);

        await Assert.That(value.Score).IsEqualTo(74);
        await Assert.That(value.Band).IsEqualTo("Good");
        await Assert.That(value.Drivers[0]).IsEqualTo("Order of 1,200.00");
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
    public async Task Unknown_Order_Is_A_404()
    {
        var response = await CreateClient(Scopes.OrdersRead).GetAsync("/api/orders/ORD-999999/overview");

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.NotFound);
    }
}
