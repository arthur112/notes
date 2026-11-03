namespace Api.Auth;

// OAuth scopes guard the Fund operations: the token's granted scopes decide which CRUD
// operations a caller may run. Missing/invalid token -> 401, valid token without the scope -> 403.
public static class Scopes
{
    public const string FundsRead = "funds.read";
    public const string FundsWrite = "funds.write";
    public const string FundsDelete = "funds.delete";

    // Advertised in the OpenAPI document and requested by Scalar's OAuth login.
    public static readonly Dictionary<string, string> All = new()
    {
        [FundsRead] = "List and read funds",
        [FundsWrite] = "Create and update funds",
        [FundsDelete] = "Delete funds",
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
