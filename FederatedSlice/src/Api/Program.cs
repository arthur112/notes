using System.Text.Json;
using Api.Auth;
using Api.Data;
using Api.ErrorHandling;
using Api.Features.Customers;
using Api.Features.Orders;
using Api.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddSqlServerDbContext<AppDbContext>(
    "app",
    configureDbContextOptions: options =>
        options.ReplaceService<IModelCacheKeyFactory, SchemaModelCacheKeyFactory>()
);
// JwtBearer reads Authority / ValidAudiences / ValidIssuer / SigningKeys from the
// Authentication:Schemes:Bearer section: `dotnet user-jwts` writes it locally, the AppHost points it
// at Keycloak. Both issuers can be trusted at once.
builder
    .Services.AddAuthentication()
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        // The claim RequireRole reads: `role` (dotnet user-jwts, Keycloak with a realm-role
        // mapper), `roles` (Entra ID).
        options.TokenValidationParameters.RoleClaimType =
            builder.Configuration["Auth:RoleClaimType"] ?? "role";
    });
builder.Services.AddAuthorization();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddOpenApi(options => options.AddDocumentTransformer<SecuritySchemeTransformer>());
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonSerializerContext.Default)
);
builder.Services.AddValidation();
// Built-in validation keys name the C# members (`Lines[0].Quantity`). The JSON is camelCase, and
// so are the order form's field paths, so the keys follow it (`lines[0].quantity`).
builder.Services.AddProblemDetails(options =>
    options.CustomizeProblemDetails = context =>
    {
        if (context.ProblemDetails is HttpValidationProblemDetails validation)
            validation.Errors = validation.Errors.ToDictionary(
                error => string.Join(
                    '.',
                    error.Key.Split('.').Select(JsonNamingPolicy.CamelCase.ConvertName)
                ),
                error => error.Value
            );
    }
);
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddHttpLogging(options =>
    options.LoggingFields =
        Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.RequestProperties
        | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.ResponseStatusCode
        | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.Duration
);

var app = builder.Build();

app.UseExceptionHandler();
// Bodiless error statuses get a problem+json body too. Authentication and authorization are
// registered after it (not left to WebApplication, which would add them first), so their 401/403 do.
app.UseStatusCodePages();
app.UseHttpLogging();
app.UseAuthentication();
app.UseAuthorization();

app.MapDefaultEndpoints();
app.MapOpenApi();
app.MapScalarApiReference(options => options.WithOAuthLogin(app.Configuration));

app.MapCustomerEndpoints();
app.MapOrderEndpoints();

app.Run();

public partial class Program;
