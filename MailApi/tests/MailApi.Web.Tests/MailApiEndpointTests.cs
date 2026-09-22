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
    public async Task EmbedsTheLogoAsAnInlineImage()
    {
        var sender = new TestEmailSender();
        using var factory = CreateFactory(sender: sender);
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/mail/send", new
        {
            template = "welcome",
            to = new[] { "ada@example.com" },
            data = new { name = "Ada", actionUrl = "https://example.com/verify" },
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(sender.Email);

        Assert.Contains("src=\"cid:logo-png@mailapi.local\"", sender.Email.HtmlBody);
        var image = Assert.Single(sender.Email.InlineImages);
        Assert.Equal("logo-png@mailapi.local", image.ContentId);
        Assert.Equal("image/png", image.ContentType);
        Assert.NotEmpty(image.Content);
    }

    [Fact]
    public async Task WrapsBodiesWithTheSharedLayout()
    {
        var sender = new TestEmailSender();
        using var factory = CreateFactory(sender: sender);
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/mail/send", new
        {
            template = "welcome",
            to = new[] { "ada@example.com" },
            data = new { name = "Ada", actionUrl = "https://example.com/verify", brand = "Contoso" },
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(sender.Email);

        var html = sender.Email.HtmlBody;
        Assert.StartsWith("<!doctype html>", html);
        Assert.EndsWith("</html>\n", html);
        Assert.Contains(">Contoso</span>", html);
        Assert.Contains("Contoso · This is an automated message", html);
        Assert.Contains("Welcome, Ada", html);
        Assert.True(
            html.IndexOf(">Contoso</span>", StringComparison.Ordinal)
                < html.IndexOf("Welcome, Ada", StringComparison.Ordinal)
            && html.IndexOf("Welcome, Ada", StringComparison.Ordinal)
                < html.IndexOf("Contoso · This is an automated message", StringComparison.Ordinal),
            "HTML body should sit between the layout header and footer.");
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
    public async Task AcceptsTheKeyOfAnyEnabledApplication()
    {
        using var factory = CreateFactory(apiKey: "primary-secret");
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/mail/evaluate")
        {
            Content = JsonContent.Create(new { template = "welcome" }),
        };
        request.Headers.Add("X-Api-Key", "secondary-secret");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task RejectsTheKeyOfADisabledApplication()
    {
        using var factory = CreateFactory(apiKey: "primary-secret");
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/mail/evaluate")
        {
            Content = JsonContent.Create(new { template = "welcome" }),
        };
        request.Headers.Add("X-Api-Key", "retired-secret");

        var response = await client.SendAsync(request);

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

    [Fact]
    public async Task EvaluateRendersHtmlWithoutSendingMail()
    {
        var sender = new TestEmailSender();
        using var factory = CreateFactory(sender: sender);
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/mail/evaluate", new
        {
            template = "welcome",
            data = new { name = "Ada", actionUrl = "https://example.com/verify", brand = "Contoso" },
        });

        var html = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.StartsWith("<!doctype html>", html);
        Assert.Contains(">Contoso</span>", html);
        Assert.Contains("Welcome, Ada", html);
        Assert.Null(sender.Email);
    }

    [Fact]
    public async Task EvaluateRejectsUnknownTemplates()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/mail/evaluate", new
        {
            template = "does-not-exist",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task EvaluateRejectsRequestsWithoutTheConfiguredApiKey()
    {
        using var factory = CreateFactory(apiKey: "secret");
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/mail/evaluate", new
        {
            template = "welcome",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ServesTheOpenApiDocument()
    {
        using var factory = CreateFactory();
        using var client = factory.CreateClient();
        var response = await client.GetAsync("/openapi/v1.json");

        var document = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("/api/mail/send", document);
        Assert.Contains("/api/mail/evaluate", document);
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
                    ["MailApi:Applications:0:Name"] = "Primary",
                    ["MailApi:Applications:0:ApiKey"] = apiKey,
                    ["MailApi:Applications:0:Description"] = "Primary test application.",
                    ["MailApi:Applications:0:Enabled"] = (apiKey is not null).ToString(),
                    ["MailApi:Applications:1:Name"] = "Secondary",
                    ["MailApi:Applications:1:ApiKey"] = apiKey is not null ? "secondary-secret" : null,
                    ["MailApi:Applications:1:Description"] = "Secondary test application.",
                    ["MailApi:Applications:1:Enabled"] = (apiKey is not null).ToString(),
                    ["MailApi:Applications:2:Name"] = "Retired",
                    ["MailApi:Applications:2:ApiKey"] = "retired-secret",
                    ["MailApi:Applications:2:Description"] = "Disabled test application.",
                    ["MailApi:Applications:2:Enabled"] = "false",
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
        public Task<Result<(string Html, IReadOnlyList<MailAsset> InlineImages), MailError>> RenderAsync(
            MailTemplate template,
            IReadOnlyDictionary<string, object?> data,
            CancellationToken cancellationToken) => Task.FromResult(
                Result.Failure<(string, IReadOnlyList<MailAsset>), MailError>(error));
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
