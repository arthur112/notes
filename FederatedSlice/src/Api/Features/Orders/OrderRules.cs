using System.Globalization;
using Api.Features.Customers;

namespace Api.Features.Orders;

public enum RuleKind
{
    OnCreate,
    OnChange,
    Always,
}

public sealed record RuleContext(
    OrderEntity Entity,
    OrderEntity? Original,
    CustomerEntity Customer,
    DateOnly Today
)
{
    public bool IsCreate => Original is null;

    public CustomerSettingsEntity? Settings => Customer.Settings;

    /// <summary>Today for a new order (the database stamps it on insert), the stored date otherwise.</summary>
    public DateOnly OrderDate => Original?.CreatedAt ?? Today;

    public bool Changed<T>(Func<OrderEntity, T> field) =>
        Original is not null && !EqualityComparer<T>.Default.Equals(field(Original), field(Entity));
}

/// <summary>
/// One business rule, as a named check. <see cref="Violated"/> reads the mapped order and
/// returns true when the save must be refused. <see cref="Message"/> says why, under
/// <see cref="Field"/>, the form field the user has to change.
/// </summary>
public sealed record OrderRule(
    string Name,
    RuleKind Kind,
    string Field,
    Func<RuleContext, bool> Violated,
    Func<RuleContext, string> Message
);

/// <summary>
/// Every special case of the order write path, as a named rule. A rule never changes what the
/// user entered: a conflicting input is a 400 on its field, so the saved order is always what the
/// form showed. Rules only read: no I/O, no services. Customer-specific behavior comes from
/// <see cref="CustomerSettingsEntity"/>, never from a hardcoded customer.
/// </summary>
public static class OrderRules
{
    public static readonly OrderRule CustomerNotOnCreditHold = new(
        "Customer is not on credit hold",
        RuleKind.Always,
        "customer",
        ctx => ctx.Customer.IsOnHold,
        ctx => $"{ctx.Customer.Name} is on credit hold."
    );

    public static readonly OrderRule CustomerInitialStatus = new(
        "New orders start in the customer's initial status",
        RuleKind.OnCreate,
        "status",
        ctx => ctx.Settings?.InitialStatus is { } initial && ctx.Entity.Status != initial,
        ctx => $"{ctx.Customer.Name} orders start as {ctx.Settings!.InitialStatus}."
    );

    public static readonly OrderRule CustomerForcedDueDays = new(
        "Due date follows the customer's contract",
        RuleKind.Always,
        "dueDate",
        ctx => ctx.Settings?.ForcedDueDays is { } days && ctx.Entity.DueDate != ctx.OrderDate.AddDays(days),
        ctx =>
        {
            var days = ctx.Settings!.ForcedDueDays!.Value;
            var due = ctx.OrderDate.AddDays(days).ToString("dd-MM-yyyy", CultureInfo.InvariantCulture);
            return $"{ctx.Customer.Name} orders are due {days} days after the order date: {due}.";
        }
    );

    public static readonly OrderRule ReferenceStaysWithItsCustomer = new(
        "A PO reference stays with its customer",
        RuleKind.OnChange,
        "reference",
        ctx =>
            ctx.Changed(e => e.CustomerId)
            && ctx.Entity.Reference is not null
            && !ctx.Changed(e => e.Reference),
        _ => "This PO reference belongs to the previous customer: clear or replace it."
    );

    public static readonly OrderRule[] All =
    [
        CustomerNotOnCreditHold,
        CustomerInitialStatus,
        CustomerForcedDueDays,
        ReferenceStaysWithItsCustomer,
    ];

    /// <summary>
    /// Runs every rule that applies to this save and collects all violations, so the form shows
    /// each problem at once. Empty means the order may be saved.
    /// </summary>
    public static Dictionary<string, string[]> Check(RuleContext ctx) =>
        All.Where(rule =>
                rule.Kind switch
                {
                    RuleKind.OnCreate => ctx.IsCreate,
                    RuleKind.OnChange => !ctx.IsCreate,
                    _ => true,
                }
            )
            .Where(rule => rule.Violated(ctx))
            .GroupBy(rule => rule.Field)
            .ToDictionary(group => group.Key, group => group.Select(rule => rule.Message(ctx)).ToArray());
}
