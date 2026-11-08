using Api.Features.Customers;
using Api.Features.Orders;
using Api.Tests.Builders;

namespace Api.Tests;

/// <summary>Each rule on a hand-built <see cref="RuleContext"/>: no host, no database.</summary>
public class OrderRulesTests
{
    private static readonly DateOnly Today = new(2026, 1, 11);

    // Fires one rule in isolation, the way Run does: Apply only when When matches.
    private static bool Fire(OrderRule rule, RuleContext ctx)
    {
        if (!rule.When(ctx))
            return false;
        rule.Apply(ctx);
        return true;
    }

    private static CustomerEntity Customer(OrderStatus? initialStatus = null, int? forcedDueDays = null) =>
        CustomerEntityBuilder.Create().WithId(1001).WithSettings(initialStatus, forcedDueDays).Build();

    [Test]
    public async Task InitialStatus_Overrides_The_Entered_Status()
    {
        var customer = Customer(initialStatus: OrderStatus.Paid);
        var order = OrderEntityBuilder.For(customer).WithStatus(OrderStatus.Pending).Build();

        var fired = Fire(OrderRules.CustomerInitialStatus, new(order, null, customer, Today));

        await Assert.That(fired).IsTrue();
        await Assert.That(order.Status).IsEqualTo(OrderStatus.Paid);
    }

    [Test]
    public async Task Customer_Without_Settings_Keeps_What_Was_Entered()
    {
        var customer = CustomerEntityBuilder.Create().Build();
        var order = OrderEntityBuilder
            .For(customer)
            .WithStatus(OrderStatus.Pending)
            .WithDueDate(new(2030, 1, 1))
            .Build();

        OrderRules.Run(new(order, null, customer, Today));

        await Assert.That(order.Status).IsEqualTo(OrderStatus.Pending);
        await Assert.That(order.DueDate).IsEqualTo(new DateOnly(2030, 1, 1));
    }

    [Test]
    public async Task ForcedDueDays_Counts_From_Today_On_Create()
    {
        var customer = Customer(forcedDueDays: 30);
        var order = OrderEntityBuilder.For(customer).WithDueDate(new(2026, 3, 1)).Build();

        Fire(OrderRules.CustomerForcedDueDays, new(order, null, customer, Today));

        await Assert.That(order.DueDate).IsEqualTo(new DateOnly(2026, 2, 10));
    }

    [Test]
    public async Task ForcedDueDays_Counts_From_The_Stored_Order_Date_On_Update()
    {
        var customer = Customer(forcedDueDays: 30);
        var original = OrderEntityBuilder.For(customer).WithCreatedAt(new(2025, 12, 1)).Build();
        var order = OrderEntityBuilder
            .For(customer)
            .WithCreatedAt(new(2025, 12, 1))
            .WithDueDate(new(2026, 6, 1))
            .Build();

        Fire(OrderRules.CustomerForcedDueDays, new(order, original, customer, Today));

        await Assert.That(order.DueDate).IsEqualTo(new DateOnly(2025, 12, 31));
    }

    [Test]
    public async Task Customer_Change_Drops_A_Reference_Left_Unchanged()
    {
        var acme = CustomerEntityBuilder.Create().WithId(1).Build();
        var globex = CustomerEntityBuilder.Create().WithId(2).Build();
        var original = OrderEntityBuilder.For(acme).WithReference("PO-77").Build();
        var order = OrderEntityBuilder.For(globex).WithReference("PO-77").Build();

        var fired = Fire(OrderRules.CustomerChangeDropsReference, new(order, original, globex, Today));

        await Assert.That(fired).IsTrue();
        await Assert.That(order.Reference).IsNull();
    }

    [Test]
    public async Task Customer_Change_Keeps_A_New_Reference()
    {
        var acme = CustomerEntityBuilder.Create().WithId(1).Build();
        var globex = CustomerEntityBuilder.Create().WithId(2).Build();
        var original = OrderEntityBuilder.For(acme).WithReference("PO-77").Build();
        var order = OrderEntityBuilder.For(globex).WithReference("PO-88").Build();

        var fired = Fire(OrderRules.CustomerChangeDropsReference, new(order, original, globex, Today));

        await Assert.That(fired).IsFalse();
        await Assert.That(order.Reference).IsEqualTo("PO-88");
    }

    [Test]
    public async Task OnCreate_Rules_Do_Not_Run_On_Update()
    {
        var customer = Customer(initialStatus: OrderStatus.Paid);
        var original = OrderEntityBuilder.For(customer).WithStatus(OrderStatus.Paid).Build();
        var order = OrderEntityBuilder.For(customer).WithStatus(OrderStatus.Shipped).Build();

        OrderRules.Run(new(order, original, customer, Today));

        await Assert.That(order.Status).IsEqualTo(OrderStatus.Shipped);
    }

    [Test]
    public async Task OnChange_Rules_Do_Not_Run_On_Create()
    {
        var customer = Customer();
        var order = OrderEntityBuilder.For(customer).WithReference("PO-1").Build();

        OrderRules.Run(new(order, null, customer, Today));

        await Assert.That(order.Reference).IsEqualTo("PO-1");
    }
}
