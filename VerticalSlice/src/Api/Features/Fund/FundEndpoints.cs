namespace Api.Features.Fund;

public static class FundEndpoints
{
    public static RouteGroupBuilder MapFundEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/funds").WithTags("Funds");

        group.MapGet("", ListFunds.Handle);

        group.MapPost("", CreateFund.Handle);

        group.MapGet("/{publicId:guid}", GetFund.Handle);

        group.MapPut("/{publicId:guid}", UpdateFund.Handle);

        group.MapDelete("/{publicId:guid}", DeleteFund.Handle);

        return group;
    }
}
