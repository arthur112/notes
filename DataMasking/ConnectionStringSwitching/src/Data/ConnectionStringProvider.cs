namespace ConnectionStringSwitching.Data;

/// <summary>
/// Picks the connection string for the *current request* based on the caller's
/// role. Admin callers connect as the SQL login that holds UNMASK; everyone else
/// connects as the low-privilege login that sees masked values.
/// Scoped: resolved once per request.
/// </summary>
public sealed class ConnectionStringProvider(IHttpContextAccessor accessor, IConfiguration config)
{
    public string Current
    {
        get
        {
            var isAdmin = accessor.HttpContext?.User.IsInRole("admin") ?? false;
            return config.GetConnectionString(isAdmin ? "Admin" : "Masked")!;
        }
    }
}
