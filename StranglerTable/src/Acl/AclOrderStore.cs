using Microsoft.EntityFrameworkCore;
using StranglerTable.Data;
using StranglerTable.Domain;

namespace StranglerTable.Acl;

public class AclOrderStore(AclDbContext db, MigrationPhase phase) : IOrderStore
{
    public async Task<List<Order>> GetAllAsync(CancellationToken ct = default)
    {
        if (!phase.IsPhase2)
            return (await db.LegacyOrders.AsNoTracking().ToListAsync(ct)).Select(LegacyOrderMapper.ToDomain).ToList();

        return (await db.OrdersV2.AsNoTracking().Include(o => o.BillingAddress).ToListAsync(ct))
            .Select(OrderMapperV2.ToDomain).ToList();
    }

    public async Task<Order?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        if (!phase.IsPhase2)
        {
            var row = await db.LegacyOrders.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            return row is null ? null : LegacyOrderMapper.ToDomain(row);
        }

        var row2 = await db.OrdersV2.AsNoTracking().Include(o => o.BillingAddress)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return row2 is null ? null : OrderMapperV2.ToDomain(row2);
    }

    public async Task<Order> AddAsync(Order order, CancellationToken ct = default)
    {
        if (!phase.IsPhase2)
        {
            var row = LegacyOrderMapper.ToRow(order);
            db.LegacyOrders.Add(row);
            await db.SaveChangesAsync(ct);
            order.Id = row.Id;
            return order;
        }

        var row2 = OrderMapperV2.ToRow(order);
        db.OrdersV2.Add(row2);
        await db.SaveChangesAsync(ct);
        order.Id = row2.Id;
        return order;
    }

    public async Task<Order?> UpdateAsync(Order order, CancellationToken ct = default)
    {
        if (!phase.IsPhase2)
        {
            var row = await db.LegacyOrders.FirstOrDefaultAsync(x => x.Id == order.Id, ct);
            if (row is null) return null;
            LegacyOrderMapper.CopyInto(order, row);
            await db.SaveChangesAsync(ct);
            return order;
        }

        var row2 = await db.OrdersV2.Include(o => o.BillingAddress)
            .FirstOrDefaultAsync(x => x.Id == order.Id, ct);
        if (row2 is null) return null;
        var fresh = OrderMapperV2.ToRow(order);
        db.Entry(row2).CurrentValues.SetValues(fresh);
        if (row2.BillingAddress is not null && fresh.BillingAddress is not null)
            db.Entry(row2.BillingAddress).CurrentValues.SetValues(fresh.BillingAddress);
        await db.SaveChangesAsync(ct);
        return order;
    }
}
