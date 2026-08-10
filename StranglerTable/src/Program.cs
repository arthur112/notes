using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using StranglerTable.Acl;
using StranglerTable.Api;
using StranglerTable.Data;
using StranglerTable.Domain;
using StranglerTable.Split;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("SqlServer")!;
var phase = new MigrationPhase(builder.Configuration.GetValue("Mapping:Phase", 1));

builder.Services.AddSingleton(phase);
builder.Services.AddDbContext<SplitDbContext>(o => o.UseSqlServer(connectionString));
builder.Services.AddDbContext<AclDbContext>(o => o.UseSqlServer(connectionString));
builder.Services.AddKeyedScoped<IOrderStore, SplitOrderStore>("split");
builder.Services.AddKeyedScoped<IOrderStore, AclOrderStore>("acl");
builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var app = builder.Build();

await SchemaRunner.ApplyAsync(connectionString, phase.IsPhase2);
app.Logger.LogInformation("Running against migration phase {Phase}", phase.Value);

await SeedAsync(app.Services);

OrderEndpoints.Map(app);

app.Run();

static async Task SeedAsync(IServiceProvider services)
{
    await using var scope = services.CreateAsyncScope();
    var store = scope.ServiceProvider.GetRequiredKeyedService<IOrderStore>("split");
    if ((await store.GetAllAsync()).Count > 0) return;

    await store.AddAsync(new Order
    {
        OrderNumber = "ORD-1001",
        OrderDate = DateTime.UtcNow.AddDays(-3),
        Status = OrderStatus.Shipped,
        Channel = "Web",
        Currency = "EUR",
        SubTotal = 120m,
        Tax = 24m,
        ShippingCost = 5.99m,
        Notes = "Leave at front door",
        IsGift = false,
        NewsletterOptIn = true,
        Customer = new Customer
        {
            ExternalRef = "CUST-42",
            FirstName = "Ada",
            LastName = "Lovelace",
            Email = "ada@example.com",
            Phone = "+32 2 555 0101",
            Company = "Analytical Engines Ltd",
            VatNumber = "BE0123456789",
            Segment = "Premium"
        },
        BillingAddress = new Address
        {
            Street = "Rue du Comput 12",
            Street2 = "Box 3",
            City = "Brussels",
            Zip = "1000",
            State = null,
            Country = "Belgium"
        },
        ShippingAddress = new Address
        {
            Street = "Avenue des Bits 7",
            City = "Ghent",
            Zip = "9000",
            Country = "Belgium"
        },
        Fulfillment = new Fulfillment
        {
            Carrier = "Bpost",
            TrackingNumber = "BE123456789",
            ShippedDate = DateTime.UtcNow.AddDays(-1),
            RequiresSignature = true
        },
        Audit = new Audit { CreatedAt = DateTime.UtcNow.AddDays(-3), CreatedBy = "seed" }
    });

    await store.AddAsync(new Order
    {
        OrderNumber = "ORD-1002",
        OrderDate = DateTime.UtcNow.AddDays(-1),
        Status = OrderStatus.Placed,
        Channel = "Partner",
        Currency = "EUR",
        SubTotal = 59.5m,
        Tax = 11.9m,
        ShippingCost = 0m,
        IsGift = true,
        Customer = new Customer
        {
            ExternalRef = "CUST-77",
            FirstName = "Grace",
            LastName = "Hopper",
            Email = "grace@example.com",
            Segment = "Standard"
        },
        BillingAddress = new Address
        {
            Street = "Compiler Lane 1",
            City = "Antwerp",
            Zip = "2000",
            Country = "Belgium"
        },
        ShippingAddress = new Address
        {
            Street = "Compiler Lane 1",
            City = "Antwerp",
            Zip = "2000",
            Country = "Belgium"
        },
        Audit = new Audit { CreatedAt = DateTime.UtcNow.AddDays(-1), CreatedBy = "seed" }
    });
}
