using InterceptorMasking.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace InterceptorMasking.Auth;

/// <summary>
/// EF caches the model per context type by default. Because EmployeeContext's
/// model differs per caller (non-admins get the masking value converter on Iban),
/// the cache key must include the admin flag — otherwise the first request's
/// model would be reused for everyone.
/// </summary>
public sealed class UserAwareModelCacheKeyFactory : IModelCacheKeyFactory
{
    public object Create(DbContext context, bool designTime) =>
        context is EmployeeContext employeeContext
            ? (context.GetType(), employeeContext.IsAdmin, designTime)
            : context.GetType();
}
