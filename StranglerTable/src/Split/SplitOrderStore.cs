using Microsoft.EntityFrameworkCore;
using StranglerTable.Domain;

namespace StranglerTable.Split;

public class SplitOrderStore(SplitDbContext db) : IOrderStore
{
    public Task<List<Order>> GetAllAsync(CancellationToken ct = default) =>
        db.Orders.AsNoTracking().ToListAsync(ct);

    public Task<Order?> GetByIdAsync(int id, CancellationToken ct = default) =>
        db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, ct);

    public async Task<Order> AddAsync(Order order, CancellationToken ct = default)
    {
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        return order;
    }

    public async Task<Order?> UpdateAsync(Order order, CancellationToken ct = default)
    {
        var existing = await db.Orders.FirstOrDefaultAsync(o => o.Id == order.Id, ct);
        if (existing is null) return null;
        db.Entry(existing).CurrentValues.SetValues(order);
        db.Entry(existing.Customer).CurrentValues.SetValues(order.Customer);
        db.Entry(existing.BillingAddress).CurrentValues.SetValues(order.BillingAddress);
        db.Entry(existing.ShippingAddress).CurrentValues.SetValues(order.ShippingAddress);
        db.Entry(existing.Fulfillment).CurrentValues.SetValues(order.Fulfillment);
        db.Entry(existing.Audit).CurrentValues.SetValues(order.Audit);
        await db.SaveChangesAsync(ct);
        return existing;
    }
}
