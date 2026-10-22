using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace GridifyHttpQuery.Api;

[JsonConverter(typeof(JsonStringEnumConverter<Segment>))]
public enum Segment { Enterprise, SMB, Startup }

public sealed class Customer
{
    public required string CustomerNo { get; init; }
    public required string Name { get; init; }
    public required string Email { get; init; }
    public Segment Segment { get; init; }
    public required string Country { get; init; }
    public bool Active { get; init; }
    public decimal CreditLimit { get; init; }
    public DateOnly CreatedAt { get; init; }
}

public sealed class CustomersDb(DbContextOptions<CustomersDb> options) : DbContext(options)
{
    public DbSet<Customer> Customers => Set<Customer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var customer = modelBuilder.Entity<Customer>();
        customer.HasKey(c => c.CustomerNo);
        customer.Property(c => c.Segment).HasConversion<string>();
        customer.HasData(
            New("CUS-1001", "Acme Corp", "billing@acme.test", Segment.Enterprise, "United States", true, 250_000, "2024-03-11"),
            New("CUS-1002", "Globex", "accounts@globex.test", Segment.SMB, "Netherlands", true, 80_000, "2024-06-02"),
            New("CUS-1003", "Initech", "finance@initech.test", Segment.Enterprise, "United States", true, 120_000, "2024-09-19"),
            New("CUS-1004", "Umbrella", "orders@umbrella.test", Segment.Enterprise, "United Kingdom", true, 400_000, "2024-11-05"),
            New("CUS-1005", "Hooli", "ap@hooli.test", Segment.SMB, "United States", false, 60_000, "2025-01-23"),
            New("CUS-1006", "Vandelay Industries", "imports@vandelay.test", Segment.SMB, "United States", true, 90_000, "2025-02-14"),
            New("CUS-1007", "Soylent Corp", "procurement@soylent.test", Segment.Startup, "Germany", true, 25_000, "2025-03-30"),
            New("CUS-1008", "Stark Industries", "billing@stark.test", Segment.Enterprise, "United States", true, 900_000, "2025-05-12"),
            New("CUS-1009", "Wayne Enterprises", "accounts@wayne.test", Segment.Enterprise, "United States", false, 750_000, "2025-06-08"),
            New("CUS-1010", "Cyberdyne Systems", "ap@cyberdyne.test", Segment.Startup, "United States", true, 15_000, "2025-08-21"),
            New("CUS-1011", "Massive Dynamic", "finance@massive.test", Segment.Enterprise, "Sweden", true, 320_000, "2025-10-03"),
            New("CUS-1012", "Pied Piper", "admin@piedpiper.test", Segment.Startup, "United States", false, 5_000, "2026-01-17"));
    }

    private static Customer New(string no, string name, string email, Segment segment, string country, bool active, decimal creditLimit, string createdAt) =>
        new()
        {
            CustomerNo = no,
            Name = name,
            Email = email,
            Segment = segment,
            Country = country,
            Active = active,
            CreditLimit = creditLimit,
            CreatedAt = DateOnly.Parse(createdAt),
        };
}
