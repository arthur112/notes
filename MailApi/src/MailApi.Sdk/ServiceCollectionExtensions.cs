using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MailApi.Sdk;

public static class MailClientServiceCollectionExtensions
{
    /// <summary>Registers <see cref="MailClient"/> configured from the given configuration section.</summary>
    public static IServiceCollection AddMailClient(
        this IServiceCollection services,
        IConfiguration configuration,
        string sectionName = MailClientOptions.SectionName)
    {
        services.Configure<MailClientOptions>(configuration.GetSection(sectionName));
        services.AddHttpClient<MailClient>();
        return services;
    }

    /// <summary>Registers <see cref="MailClient"/> configured inline.</summary>
    public static IServiceCollection AddMailClient(
        this IServiceCollection services,
        Action<MailClientOptions> configure)
    {
        services.Configure(configure);
        services.AddHttpClient<MailClient>();
        return services;
    }
}
