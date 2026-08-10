namespace StranglerTable.Domain;

public interface IOrderStore
{
    Task<List<Order>> GetAllAsync(CancellationToken ct = default);
    Task<Order?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Order> AddAsync(Order order, CancellationToken ct = default);
    Task<Order?> UpdateAsync(Order order, CancellationToken ct = default);
}
