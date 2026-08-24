using System.Security.Claims;

namespace ConnectionStringSwitching.Auth;

/// <summary>
/// Fake authentication: reads the X-User-Role header (admin|user) and turns it
/// into a ClaimsPrincipal. Stands in for a real OIDC/JWT pipeline — the point of
/// the note is what happens *after* the identity is known.
/// </summary>
public sealed class FakeAuthMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var role = context.Request.Headers["X-User-Role"].FirstOrDefault() ?? "user";
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.Name, $"{role}@contoso.com"), new Claim(ClaimTypes.Role, role)],
            authenticationType: "FakeHeader");
        context.User = new ClaimsPrincipal(identity);
        await next(context);
    }
}
