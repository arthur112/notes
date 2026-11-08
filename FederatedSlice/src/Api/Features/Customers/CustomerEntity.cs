namespace Api.Features.Customers;

public class CustomerEntity
{
    public int Id { get; set; }

    /// <summary>Computed by the database from <see cref="Id"/> (<c>CUS-1001</c>).</summary>
    public string CustomerNo { get; private set; } = "";
    public required string Name { get; set; }
    public required string Email { get; set; }
    public Segment Segment { get; set; }
    public required string Country { get; set; }
    public bool Active { get; set; }
    public decimal CreditLimit { get; set; }
    public int PaymentTermsDays { get; set; }
    public bool IsVip { get; set; }
    public bool IsVerified { get; set; }

    /// <summary>On credit hold: no order may be saved for this customer.</summary>
    public bool IsOnHold { get; set; }

    /// <summary>Defaults to today in the database; set it to back-date a customer.</summary>
    public DateOnly CreatedAt { get; set; }

    /// <summary>The customer's order rules; <c>null</c> when it has none.</summary>
    public CustomerSettingsEntity? Settings { get; set; }
}
