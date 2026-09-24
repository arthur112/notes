using CSharpFunctionalExtensions;
using MailApi.Application.Abstractions;
using MailApi.Application.SendMail;
using MailApi.Domain;
using Xunit;

namespace MailApi.Application.Tests;

public sealed class SendMailHandlerTests
{
    [Fact]
    public async Task UsesRequestSubjectAndSendsRenderedHtml()
    {
        var sender = new CapturingEmailSender();
        var handler = new SendMailHandler(
            new StaticTemplateRenderer("<p>Hello</p>"),
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
    }

    [Fact]
    public async Task UsesTemplateDefaultSubjectWhenRequestHasNone()
    {
        var sender = new CapturingEmailSender();
        var handler = new SendMailHandler(
            new StaticTemplateRenderer("<p>Hello</p>"),
            sender);

        var result = await handler.HandleAsync(new SendMailCommand(
            "welcome",
            ["ada@example.com"],
            [],
            null,
            new Dictionary<string, object?>()),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(sender.Email);
        Assert.Equal(MailTemplate.Welcome.DefaultSubject(), sender.Email.Subject);
    }

    [Fact]
    public async Task RejectsUnknownTemplateBeforeRendering()
    {
        var handler = new SendMailHandler(
            new StaticTemplateRenderer(""),
            new CapturingEmailSender());

        var result = await handler.HandleAsync(new SendMailCommand(
            "newsletter",
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
            new StaticTemplateRenderer(""),
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
    public async Task PassesAttachmentsThroughToTheEmail()
    {
        var sender = new CapturingEmailSender();
        var handler = new SendMailHandler(
            new StaticTemplateRenderer("<p>Hello</p>"),
            sender);
        var attachment = new MailAttachment(
            "report.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            [1, 2, 3]);

        var result = await handler.HandleAsync(new SendMailCommand(
            "welcome",
            ["ada@example.com"],
            [],
            null,
            new Dictionary<string, object?>(),
            [attachment]),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(sender.Email);
        var sent = Assert.Single(sender.Email.Attachments);
        Assert.Equal("report.xlsx", sent.FileName);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", sent.ContentType);
        Assert.Equal(new byte[] { 1, 2, 3 }, sent.Content);
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

    private sealed class StaticTemplateRenderer(string html) : ITemplateRenderer
    {
        public Task<Result<(string Html, IReadOnlyList<MailAsset> InlineImages), MailError>> RenderAsync(
            MailTemplate template,
            IReadOnlyDictionary<string, object?> data,
            CancellationToken cancellationToken) => Task.FromResult(
                Result.Success<(string, IReadOnlyList<MailAsset>), MailError>((html, [])));
    }

    private sealed class FailingTemplateRenderer(MailError error) : ITemplateRenderer
    {
        public Task<Result<(string Html, IReadOnlyList<MailAsset> InlineImages), MailError>> RenderAsync(
            MailTemplate template,
            IReadOnlyDictionary<string, object?> data,
            CancellationToken cancellationToken) => Task.FromResult(
                Result.Failure<(string, IReadOnlyList<MailAsset>), MailError>(error));
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
