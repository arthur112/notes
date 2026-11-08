namespace Api.Auth;

// Roles say what the *user* may do; scopes (Scopes.cs) say what the *client app* may do on the
// user's behalf. Saving an order needs both: an app granted `orders.write` AND a user holding
// `order-editor`.
public static class Roles
{
    public const string OrderEditor = "order-editor";
}
