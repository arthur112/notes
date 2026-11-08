using Api.Features.Customers;
using Api.Features.Orders;
using Api.Tests.Builders;

namespace Api.Tests;

/// <summary>Each rule on a hand-built <see cref="RuleContext"/>: no host, no database.</summary>
public class OrderRulesTests
{
    private static readonly DateOnly Today = new(2026, 1, 11);

    private static CustomerEntity Customer(OrderStatus? initialStatus = null, int? forcedDueDays = null) =>
        CustomerEntityBuilder
            .Create()
            .WithId(1001)
            .WithName("Globex")
            .WithSettings(initialStatus, forcedDueDays)
            .Build();

    private static RuleContext Create(OrderEntity order, CustomerEntity customer) =>
        new(order, null, customer, Today);

    [Test]
    public async Task CreditHold_Is_Violated_For_A_Customer_On_Hold()
    {
        var customer = CustomerEntityBuilder.Create().WithName("Umbrella").OnHold().Build();
        var ctx = Create(OrderEntityBuilder.For(customer).Build(), customer);

        await Assert.That(OrderRules.CustomerNotOnCreditHold.Violated(ctx)).IsTrue();
        await Assert.That(OrderRules.CustomerNotOnCreditHold.Message(ctx)).IsEqualTo("Umbrella is on credit hold.");
    }

    [Test]
    [Arguments(OrderStatus.Pending, true)]
    [Arguments(OrderStatus.Paid, false)]
    public async Task InitialStatus_Requires_The_Customers_Status(OrderStatus status, bool violated)
    {
        var customer = Customer(initialStatus: OrderStatus.Paid);
        var ctx = Create(OrderEntityBuilder.For(customer).WithStatus(status).Build(), customer);

        await Assert.That(OrderRules.CustomerInitialStatus.Violated(ctx)).IsEqualTo(violated);
    }

    [Test]
    public async Task No_Settings_Means_No_Customer_Rule()
    {
        var customer = CustomerEntityBuilder.Create().Build();
        var ctx = Create(OrderEntityBuilder.For(customer).WithDueDate(new(2030, 1, 1)).Build(), customer);

        await Assert.That(OrderRules.Check(ctx)).IsEmpty();
    }

    [Test]
    public async Task ForcedDueDays_Counts_From_Today_On_Create()
    {
        var customer = Customer(forcedDueDays: 30);
        var wrong = Create(OrderEntityBuilder.For(customer).WithDueDate(new(2026, 3, 1)).Build(), customer);
        var right = Create(OrderEntityBuilder.For(customer).WithDueDate(new(2026, 2, 10)).Build(), customer);

        await Assert.That(OrderRules.CustomerForcedDueDays.Violated(wrong)).IsTrue();
        await Assert
            .That(OrderRules.CustomerForcedDueDays.Message(wrong))
            .IsEqualTo("Globex orders are due 30 days after the order date: 10-02-2026.");
        await Assert.That(OrderRules.CustomerForcedDueDays.Violated(right)).IsFalse();
    }

    [Test]
    public async Task ForcedDueDays_Counts_From_The_Stored_Order_Date_On_Update()
    {
        var customer = Customer(forcedDueDays: 30);
        var original = OrderEntityBuilder.For(customer).WithCreatedAt(new(2025, 12, 1)).Build();
        var entity = OrderEntityBuilder.For(customer).WithCreatedAt(new(2025, 12, 1)).WithDueDate(new(2025, 12, 31)).Build();

        await Assert.That(OrderRules.CustomerForcedDueDays.Violated(new(entity, original, customer, Today))).IsFalse();
    }

    [Test]
    public async Task Reference_Kept_Across_A_Customer_Change_Is_Violated()
    {
        var acme = CustomerEntityBuilder.Create().WithId(1).Build();
        var globex = CustomerEntityBuilder.Create().WithId(2).Build();
        var original = OrderEntityBuilder.For(acme).WithReference("PO-77").Build();
        var kept = OrderEntityBuilder.For(globex).WithReference("PO-77").Build();
        var replaced = OrderEntityBuilder.For(globex).WithReference("PO-88").Build();

        await Assert.That(OrderRules.ReferenceStaysWithItsCustomer.Violated(new(kept, original, globex, Today))).IsTrue();
        await Assert.That(OrderRules.ReferenceStaysWithItsCustomer.Violated(new(replaced, original, globex, Today))).IsFalse();
    }

    [Test]
    public async Task OnCreate_Rules_Do_Not_Run_On_Update()
    {
        var customer = Customer(initialStatus: OrderStatus.Paid);
        var original = OrderEntityBuilder.For(customer).WithStatus(OrderStatus.Paid).Build();
        var entity = OrderEntityBuilder.For(customer).WithStatus(OrderStatus.Shipped).Build();

        await Assert.That(OrderRules.Check(new(entity, original, customer, Today))).IsEmpty();
    }

    [Test]
    public async Task Check_Collects_Every_Violation_By_Field()
    {
        var customer = CustomerEntityBuilder.Create().WithName("Umbrella").OnHold().WithSettings(OrderStatus.Paid, 30).Build();
        var ctx = Create(OrderEntityBuilder.For(customer).WithStatus(OrderStatus.Pending).Build(), customer);

        await Assert.That(OrderRules.Check(ctx).Keys).IsEquivalentTo(["customer", "status", "dueDate"]);
    }
}
