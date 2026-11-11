using Api.Features.Customers;

namespace Api.Features.Orders;

/// <summary>
/// Plain 1:1 copies, no business logic (that lives in <see cref="OrderRules"/>). <c>Id</c>,
/// <c>OrderNo</c> and <c>CreatedAt</c> are never written here: the database owns them. Nor is
/// <c>InvoicedAt</c>: invoicing sets it, not the form.
/// <c>OrderMapperTests</c> checks that a fully filled input leaves no other property at its default.
/// </summary>
public static class OrderMapper
{
    extension(OrderEntity target)
    {
        /// <summary>A full replacement, lines included: the removed lines are orphans, which EF deletes.</summary>
        public void MapFrom(OrderInput input, CustomerEntity customer)
        {
            target.CustomerId = customer.Id;
            target.Customer = customer;
            target.Status = input.Status;
            // [Required] has run before any handler, so the value is there.
            target.DueDate = input.DueDate!.Value;
            target.Reference = input.Reference;
            target.IsUrgent = input.IsUrgent!.Value;
            target.Lines.Clear();
            target.Lines.AddRange(
                input.Lines.Select(l => new OrderLineEntity
                {
                    Product = l.Product,
                    Quantity = l.Quantity,
                    UnitPrice = l.UnitPrice,
                })
            );
        }

        /// <summary>Needs <see cref="OrderEntity.Customer"/> and <see cref="OrderEntity.Lines"/> loaded.</summary>
        public OrderDetail ToDetail() =>
            new(
                target.OrderNo,
                target.Customer.Name,
                target.Status,
                target.DueDate,
                target.Reference,
                target.IsUrgent,
                [.. target.Lines.Select(l => new OrderLine(l.Product, l.Quantity, l.UnitPrice))],
                target.CreatedAt
            );
    }
}
