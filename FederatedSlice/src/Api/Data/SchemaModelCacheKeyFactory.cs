using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Api.Data;

public class SchemaModelCacheKeyFactory : IModelCacheKeyFactory
{
    public object Create(DbContext context, bool designTime) =>
        context is AppDbContext appContext
            ? (context.GetType(), appContext.SchemaName, designTime)
            : (context.GetType(), designTime);
}
