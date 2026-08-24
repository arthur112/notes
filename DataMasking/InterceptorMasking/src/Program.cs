using InterceptorMasking.Api;
using InterceptorMasking.Auth;
using InterceptorMasking.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddDbContext<EmployeeContext>((sp, options) =>
    options
        .UseSqlServer(builder.Configuration.GetConnectionString("App"))
        .ReplaceService<IModelCacheKeyFactory, UserAwareModelCacheKeyFactory>()
        .AddInterceptors(new MaskingInterceptor(sp.GetRequiredService<ICurrentUser>())));

var app = builder.Build();

await SchemaRunner.ApplyAsync(app.Configuration.GetConnectionString("App")!);

app.UseMiddleware<FakeAuthMiddleware>();
app.MapEmployeeEndpoints();

app.Run();
