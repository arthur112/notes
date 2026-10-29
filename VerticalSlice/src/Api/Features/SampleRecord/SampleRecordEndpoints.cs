namespace Api.Features.SampleRecord;

public static class SampleRecordEndpoints
{
    public static RouteGroupBuilder MapSampleRecordEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sample-records").WithTags("SampleRecords");

        group.MapGet("", ListSampleRecords.Handle);

        group.MapPost("", CreateSampleRecord.Handle);

        group.MapPost("/import", ImportSampleRecords.Handle);

        group.MapGet("/{publicId:guid}", GetSampleRecord.Handle);

        group.MapPut("/{publicId:guid}", UpdateSampleRecord.Handle);

        group.MapDelete("/{publicId:guid}", DeleteSampleRecord.Handle);

        return group;
    }
}
