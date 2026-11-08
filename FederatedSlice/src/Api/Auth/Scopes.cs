namespace Api.Auth;

// OAuth scopes say what the *client app* may do: one per area and access level, declared on each
// route in the slice's *Endpoints.cs. Missing/invalid token -> 401, valid token without the scope -> 403.
public static class Scopes
{
    public const string CustomersRead = "customers.read";
    public const string OrdersRead = "orders.read";
    public const string OrdersWrite = "orders.write";

    // Advertised in the OpenAPI document and requested by Scalar's OAuth login.
    public static readonly Dictionary<string, string> All = new()
    {
        [CustomersRead] = "List customers",
        [OrdersRead] = "List and read orders",
        [OrdersWrite] = "Create and update orders",
    };

    // Accepts both token shapes: one `scope` claim per scope (dotnet user-jwts) and a single
    // space-delimited `scope` (RFC 9068: Keycloak, ADFS) or `scp` (Entra ID) claim.
    public static TBuilder RequireScope<TBuilder>(this TBuilder builder, string scope)
        where TBuilder : IEndpointConventionBuilder =>
        builder.RequireAuthorization(policy =>
            policy
                .RequireAuthenticatedUser()
                .RequireAssertion(context =>
                    context
                        .User.FindAll(claim => claim.Type is "scope" or "scp")
                        .SelectMany(claim => claim.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                        .Contains(scope)
                )
        );
}
