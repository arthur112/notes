using Api.Features.Orders;
using Api.Tests.Builders;

namespace Api.Tests;

public class OrderMapperTests
{
    // Set by the database, never by the mapper. With hand-written mapping, this test is what
    // catches a column MapFrom forgot.
    private static readonly string[] NotMapped =
    [
        nameof(OrderEntity.Id),
        nameof(OrderEntity.OrderNo),
        nameof(OrderEntity.CreatedAt),
    ];

    [Test]
    public async Task Fully_Filled_Input_Leaves_No_Entity_Property_At_Default()
    {
        var customer = CustomerEntityBuilder.Create().WithId(1001).Build();
        var entity = new OrderEntity();

        entity.MapFrom(
            OrderInputBuilder.For(customer.Name).WithStatus(OrderStatus.Shipped).WithReference("PO-1").Build(),
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
