namespace InterceptorMasking.Auth;

/// <summary>Abstraction over "who is calling", so the interceptor stays testable.</summary>
public interface ICurrentUser
{
    bool IsAdmin { get; }
    string Name { get; }
}

public sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public bool IsAdmin => accessor.HttpContext?.User.IsInRole("admin") ?? false;
    public string Name => accessor.HttpContext?.User.Identity?.Name ?? "anonymous";
}
