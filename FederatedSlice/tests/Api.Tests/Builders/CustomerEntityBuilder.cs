using Api.Features.Customers;
using Api.Features.Orders;

namespace Api.Tests.Builders;

public class CustomerEntityBuilder
{
    // Names are unique (customers_name), so each customer gets its own unless a test sets one.
    private string _name = $"Customer {Guid.NewGuid():N}";
    private Segment _segment = Segment.SMB;
    private string _country = "Germany";
    private bool _isVip;
    private bool _isOnHold;
    private bool _isVerified;
    private DateOnly _createdAt = new(2025, 1, 1);
    private int _id;
    private CustomerSettingsEntity? _settings;

    public static CustomerEntityBuilder Create() => new();

    public CustomerEntityBuilder WithName(string name)
    {
        _name = name;
        return this;
    }

    public CustomerEntityBuilder WithSegment(Segment segment)
    {
        _segment = segment;
        return this;
    }

    public CustomerEntityBuilder WithCountry(string country)
    {
        _country = country;
        return this;
    }

    public CustomerEntityBuilder Vip()
    {
        _isVip = true;
        return this;
    }

    public CustomerEntityBuilder OnHold()
    {
        _isOnHold = true;
        return this;
    }

    public CustomerEntityBuilder Verified()
    {
        _isVerified = true;
        return this;
    }

    public CustomerEntityBuilder WithCreatedAt(DateOnly createdAt)
    {
        _createdAt = createdAt;
        return this;
    }

    /// <summary>For unit tests only: seeded customers get their id from the identity.</summary>
    public CustomerEntityBuilder WithId(int id)
    {
        _id = id;
        return this;
    }

    public CustomerEntityBuilder WithSettings(OrderStatus? initialStatus = null, int? forcedDueDays = null)
    {
        _settings = new() { InitialStatus = initialStatus, ForcedDueDays = forcedDueDays };
        return this;
    }

    public CustomerEntity Build() =>
        new()
        {
            Id = _id,
            Settings = _settings,
            Name = _name,
            Email = "billing@example.test",
            Segment = _segment,
            Country = _country,
            Active = true,
            CreditLimit = 10_000,
            PaymentTermsDays = 30,
            IsVip = _isVip,
            IsOnHold = _isOnHold,
            IsVerified = _isVerified,
            CreatedAt = _createdAt,
        };
}
