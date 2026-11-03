using Api.Auth;

namespace Api.Features.Fund;

public static class FundEndpoints
{
    public static RouteGroupBuilder MapFundEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/funds").WithTags("Funds");

        group.MapGet("", ListFunds.Handle).RequireScope(Scopes.FundsRead);

        group.MapPost("", CreateFund.Handle).RequireScope(Scopes.FundsWrite);

        group.MapGet("/{publicId:guid}", GetFund.Handle).RequireScope(Scopes.FundsRead);

        group.MapPut("/{publicId:guid}", UpdateFund.Handle).RequireScope(Scopes.FundsWrite);

        // Scope: the app may delete. Role: this user may delete. Both must hold.
        group
            .MapDelete("/{publicId:guid}", DeleteFund.Handle)
            .RequireScope(Scopes.FundsDelete)
            .RequireAuthorization(policy => policy.RequireRole(Roles.FundAdmin));

        return group;
    }
}
