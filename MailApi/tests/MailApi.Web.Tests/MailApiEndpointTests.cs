using System.Net;
using System.Net.Http.Json;
using CSharpFunctionalExtensions;
using MailApi.Application.Abstractions;
using MailApi.Application.SendMail;
using MailApi.Domain;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace MailApi.Web.Tests;

public sealed class MailApiEndpointTests
{
    [Fact]
    public async Task SendsMailUsingTemplatesAvailableInTheTestBin()
    {
        Assert.True(File.Exists(Path.Combine(AppContext.BaseDirectory, "templates", "welcome.liquid")));

        var sender = new TestEmailSender();
        using var factory = CreateFactory(sender: sender);
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/mail/send", new
        {
            template = "welcome",
            to = new[] { "ada@example.com" },
            data = new { name = "Ada", actionUrl = "https://example.com/verify" },
        });

        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == HttpStatusCode.OK, body);
        Assert.Contains("messageId", body);
        Assert.NotNull(sender.Email);
    }

    [Fact]
    public async Task EncodesTemplateDataInsertedIntoHtml()
    {
        var sender = new TestEmailSender();
        using var factory = CreateFactory(sender: sender);
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/mail/send", new
        {
            template = "welcome",
            to = new[] { "ada@example.com" },
            data = new { name = "<script>alert(1)</script>", actionUrl = "https://example.com/?a=1&b=2" },
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(sender.Email);
        Assert.Contains("&lt;script&gt;alert(1)&lt;/script&gt;", sender.Email.HtmlBody);
        Assert.DoesNotContain("<script>", sender.Email.HtmlBody);
    }

    [Fact]
    public async Task RejectsRequestsWithoutTheConfiguredApiKey()
    {
        using var factory = CreateFactory(apiKey: "secret");
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/mail/send", new
        {
            template = "welcome",
            to = new[] { "ada@example.com" },
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task MapsDeliveryFailuresToBadGateway()
    {
        using var factory = CreateFactory(sender: new TestEmailSender(failDelivery: true));
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/mail/send", new
        {
            template = "welcome",
            to = new[] { "ada@example.com" },
        });

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task MapsInvalidDeployedTemplatesToInternalServerError()
    {
        using var factory = CreateFactory(renderer: new FailingTemplateRenderer(
            MailError.TemplateInvalid("Invalid Liquid syntax.")));
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/mail/send", new
        {
            template = "welcome",
            to = new[] { "ada@example.com" },
        });

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
    }

    [Fact]
    public async Task RejectsNullRecipients()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/mail/send", new
        {
            template = "welcome",
            to = (string[]?)null,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RejectsNonObjectTemplateData()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/mail/send", new
        {
            template = "welcome",
            to = new[] { "ada@example.com" },
            data = new[] { "not", "an", "object" },
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RejectsMalformedRecipientBeforeConnectingToSmtp()
    {
        using var factory = CreateFactory(useRealSender: true);
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/mail/send", new
        {
            template = "welcome",
            to = new[] { "<>" },
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static WebApplicationFactory<Program> CreateFactory(
        IEmailSender? sender = null,
        ITemplateRenderer? renderer = null,
        string? apiKey = null,
        bool useRealSender = false) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, configuration) =>
            {
                configuration.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Smtp:Host"] = "localhost",
                    ["Smtp:Port"] = "1025",
                    ["Smtp:Security"] = "None",
                    ["Smtp:From:Name"] = "System",
                    ["Smtp:From:Address"] = "no-reply@example.com",
                    ["MailApi:ApiKey"] = apiKey,
                });
            });
            builder.ConfigureTestServices(services =>
            {
                if (useRealSender)
                    return;

                services.RemoveAll<IEmailSender>();
                services.AddSingleton(sender ?? new TestEmailSender());

                if (renderer is not null)
                {
                    services.RemoveAll<ITemplateRenderer>();
                    services.AddSingleton(renderer);
                }
            });
        });

    private sealed class FailingTemplateRenderer(MailError error) : ITemplateRenderer
    {
        public Task<Result<RenderedTemplate, MailError>> RenderAsync(
            TemplateKey templateKey,
            IReadOnlyDictionary<string, object?> data,
            CancellationToken cancellationToken) => Task.FromResult(
                Result.Failure<RenderedTemplate, MailError>(error));
    }

    private sealed class TestEmailSender(bool failDelivery = false) : IEmailSender
    {
        public OutboundEmail? Email { get; private set; }

        public Task<Result<string, MailError>> SendAsync(
            OutboundEmail email,
            CancellationToken cancellationToken)
        {
            Email = email;
            if (failDelivery)
                return Task.FromResult(Result.Failure<string, MailError>(
                    MailError.Delivery(new IOException("SMTP unavailable."))));

            return Task.FromResult(Result.Success<string, MailError>("test-message-id"));
        }
    }
}
