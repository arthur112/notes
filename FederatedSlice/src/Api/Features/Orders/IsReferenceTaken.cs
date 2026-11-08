using Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Api.Features.Orders;

/// <summary>The order form's async reference check; the order being edited doesn't count.</summary>
public static class IsReferenceTaken
{
    public static Task<bool> Handle(string reference, string? exceptOrderNo, AppDbContext db) =>
        db.Orders.AnyAsync(o => o.Reference == reference && o.OrderNo != exceptOrderNo);
}
