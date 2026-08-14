using MailApi.Application.Abstractions;
using MailApi.Infrastructure.Configuration;
using MailApi.Infrastructure.Email;
using MailApi.Infrastructure.Templating;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace MailApi.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddMailInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton<IValidateOptions<SmtpOptions>, SmtpOptionsValidator>();
        services.AddOptions<SmtpOptions>()
            .Bind(configuration.GetSection(SmtpOptions.SectionName))
            .ValidateOnStart();

        services.AddSingleton<FileLiquidTemplateRenderer>();
        services.AddSingleton<ITemplateRenderer>(provider => provider.GetRequiredService<FileLiquidTemplateRenderer>());
        services.AddSingleton<IEmailSender, SmtpEmailSender>();
        return services;
    }
}
