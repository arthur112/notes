using CSharpFunctionalExtensions;
using MailApi.Application.Abstractions;
using MailApi.Application.SendMail;
using MailApi.Domain;
using Xunit;

namespace MailApi.Application.Tests;

public sealed class SendMailHandlerTests
{
    [Fact]
    public async Task UsesRequestSubjectAndSendsRenderedParts()
    {
        var sender = new CapturingEmailSender();
        var handler = new SendMailHandler(
            new StaticTemplateRenderer(new RenderedTemplate("<p>Hello</p>", "Template subject", "Hello")),
            sender);

        var result = await handler.HandleAsync(new SendMailCommand(
            "welcome",
            ["ada@example.com"],
            [],
            "Request subject",
            new Dictionary<string, object?>()),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("message-id", result.Value);
        Assert.NotNull(sender.Email);
        Assert.Equal("Request subject", sender.Email.Subject);
        Assert.Equal("<p>Hello</p>", sender.Email.HtmlBody);
        Assert.Equal("Hello", sender.Email.TextBody);
    }

    [Fact]
    public async Task RejectsInvalidTemplateKeyBeforeRendering()
    {
        var handler = new SendMailHandler(
            new StaticTemplateRenderer(new RenderedTemplate("", null, null)),
            new CapturingEmailSender());

        var result = await handler.HandleAsync(new SendMailCommand(
            "../secret",
            ["ada@example.com"],
            [],
            null,
            new Dictionary<string, object?>()),
            CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(MailErrorType.Validation, result.Error.Type);
    }

    [Fact]
    public async Task RejectsNullRecipients()
    {
        var handler = new SendMailHandler(
            new StaticTemplateRenderer(new RenderedTemplate("", null, null)),
            new CapturingEmailSender());

        var result = await handler.HandleAsync(new SendMailCommand(
            "welcome",
            null,
            null,
            null,
            new Dictionary<string, object?>()),
            CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(MailErrorType.Validation, result.Error.Type);
    }

    [Fact]
    public async Task PropagatesTemplateFailureWithoutSending()
    {
        var sender = new CapturingEmailSender();
        var expectedError = MailError.TemplateUnavailable(new IOException("Template read failed."));
        var handler = new SendMailHandler(new FailingTemplateRenderer(expectedError), sender);

        var result = await handler.HandleAsync(new SendMailCommand(
            "welcome",
            ["ada@example.com"],
            null,
            null,
            new Dictionary<string, object?>()),
            CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(expectedError, result.Error);
        Assert.Null(sender.Email);
    }

    private sealed class StaticTemplateRenderer(RenderedTemplate template) : ITemplateRenderer
    {
        public Task<Result<RenderedTemplate, MailError>> RenderAsync(
            TemplateKey templateKey,
            IReadOnlyDictionary<string, object?> data,
            CancellationToken cancellationToken) => Task.FromResult(
                Result.Success<RenderedTemplate, MailError>(template));
    }

    private sealed class FailingTemplateRenderer(MailError error) : ITemplateRenderer
    {
        public Task<Result<RenderedTemplate, MailError>> RenderAsync(
            TemplateKey templateKey,
            IReadOnlyDictionary<string, object?> data,
            CancellationToken cancellationToken) => Task.FromResult(
                Result.Failure<RenderedTemplate, MailError>(error));
    }

    private sealed class CapturingEmailSender : IEmailSender
    {
        public OutboundEmail? Email { get; private set; }

        public Task<Result<string, MailError>> SendAsync(
            OutboundEmail email,
            CancellationToken cancellationToken)
        {
            Email = email;
            return Task.FromResult(Result.Success<string, MailError>("message-id"));
        }
    }
}
