using Api.Data;
using Api.ErrorHandling;
using Api.Features.Fund;
using Api.Features.SampleRecord;
using Api.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddSqlServerDbContext<AppDbContext>(
    "app",
    configureDbContextOptions: options =>
        options
            .ReplaceService<IModelCacheKeyFactory, SchemaModelCacheKeyFactory>()
            .AddInterceptors(new AuditInterceptor(TimeProvider.System))
);
builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonSerializerContext.Default)
);
builder.Services.AddValidation();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddHttpLogging(options =>
    options.LoggingFields =
        Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.RequestProperties
        | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.ResponseStatusCode
        | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.Duration
);

var app = builder.Build();

app.UseExceptionHandler();
app.UseHttpLogging();

if (app.Environment.IsDevelopment())
    app.MapGet(
        "/error/throw",
        static IResult () => throw new InvalidOperationException("Test exception")
    );

app.MapDefaultEndpoints();
app.MapOpenApi();
app.MapScalarApiReference();

app.MapFundEndpoints();
app.MapSampleRecordEndpoints();

app.Run();

public partial class Program;
