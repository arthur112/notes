namespace Api.Auth;

// Roles say what the *user* may do; scopes (Scopes.cs) say what the *client app* may do on the
// user's behalf. A route can require both: deleting a fund needs an app granted `funds.delete`
// AND a user holding `fund-admin`.
public static class Roles
{
    public const string FundAdmin = "fund-admin";
}
