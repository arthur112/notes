using Api.Features.Orders;
using Api.Tests.Builders;

namespace Api.Tests;

public class OrderMapperTests
{
    // Not the form's to write, each for its reason. With hand-written mapping, this test is what
    // catches a column MapFrom forgot: a new one fails here until it is mapped or listed.
    private static readonly string[] NotMapped =
    [
        // Set by the database.
        nameof(OrderEntity.Id),
        nameof(OrderEntity.OrderNo),
        nameof(OrderEntity.CreatedAt),
        // Set by invoicing (seed data only, for now), so a PUT keeps it.
        nameof(OrderEntity.InvoicedAt),
    ];

    [Test]
    public async Task Fully_Filled_Input_Leaves_No_Entity_Property_At_Default()
    {
        var customer = CustomerEntityBuilder.Create().WithId(1001).Build();
        var entity = new OrderEntity();

        entity.MapFrom(
            OrderInputBuilder.For(customer.Name).WithStatus(OrderStatus.Shipped).WithReference("PO-1").WithUrgent().Build(),
            customer
        );

        var atDefault = typeof(OrderEntity)
            .GetProperties()
            .Where(p => !NotMapped.Contains(p.Name))
            .Where(p =>
            {
                var value = p.GetValue(entity);
                var type = Nullable.GetUnderlyingType(p.PropertyType) ?? p.PropertyType;
                return value is null
                    || value is ""
                    || value is System.Collections.ICollection { Count: 0 }
                    || (type.IsValueType && value.Equals(Activator.CreateInstance(type)));
            })
            .Select(p => p.Name);

        await Assert.That(atDefault).IsEmpty();
    }
}
