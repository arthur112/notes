using Api.Features.Orders;

namespace Api.Features.Customers;

/// <summary>
/// Per-customer overrides that used to be hardcoded <c>if (customer == "...")</c> branches. Each
/// column is read by one named rule in <see cref="OrderRules"/>; <c>null</c> means "no rule for
/// this customer". Lives with the customer, since it is customer data the customers list shows.
/// </summary>
public class CustomerSettingsEntity
{
    public int CustomerId { get; set; }

    /// <summary>New orders get this status, whatever was entered.</summary>
    public OrderStatus? InitialStatus { get; set; }

    /// <summary>Every save sets the due date to the order date plus this many days.</summary>
    public int? ForcedDueDays { get; set; }
}
