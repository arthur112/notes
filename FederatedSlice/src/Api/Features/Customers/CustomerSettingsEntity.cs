using Api.Features.Orders;

namespace Api.Features.Customers;

/// <summary>
/// Per-customer order rules that used to be hardcoded customer checks. Each column is read by one
/// named rule in <see cref="OrderRules"/>; <c>null</c> means "no rule for this customer". Lives
/// with the customer, since it is customer data the customers list shows.
/// </summary>
public class CustomerSettingsEntity
{
    public int CustomerId { get; set; }

    /// <summary>New orders must start in this status.</summary>
    public OrderStatus? InitialStatus { get; set; }

    /// <summary>Orders must be due exactly this many days after the order date.</summary>
    public int? ForcedDueDays { get; set; }
}
