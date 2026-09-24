using System.Net.Http.Json;
using System.Text.Json;
using MailApi.Contracts;
using Microsoft.Extensions.Options;

namespace MailApi.Sdk;

/// <summary>
/// Thin client for the central Mail API. Resolves the JSON contract, attaches the API key,
/// and returns the server-assigned <c>messageId</c>.
/// </summary>
public sealed class MailClient
{
    private readonly HttpClient _http;
    private readonly MailClientOptions _options;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public MailClient(HttpClient http, IOptions<MailClientOptions> options)
    {
        _options = options.Value;
        _http = http;
        _http.BaseAddress = new Uri(_options.BaseUrl);
        _http.Timeout = _options.Timeout;
    }

    public Task<string> SendAsync(
        string template,
        IEnumerable<string> to,
        object? data = null,
        string? subject = null,
        IEnumerable<string>? cc = null,
        IEnumerable<MailAttachment>? attachments = null,
        CancellationToken ct = default)
        => SendAsync(new SendMailRequest
        {
            Template = template,
            To = to.ToList(),
            Cc = cc?.ToList(),
            Subject = subject,
            Data = data,
            Attachments = attachments?.ToList(),
        }, ct);

    public async Task<string> SendAsync(SendMailRequest request, CancellationToken ct = default)
    {
        using var message = new HttpRequestMessage(HttpMethod.Post, "api/mail/send")
        {
            Content = JsonContent.Create(request, options: JsonOptions),
        };
        if (!string.IsNullOrEmpty(_options.ApiKey))
            message.Headers.TryAddWithoutValidation("X-Api-Key", _options.ApiKey);

        using var response = await _http.SendAsync(message, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new MailApiException((int)response.StatusCode, body);

        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("messageId").GetString() ?? string.Empty;
    }
}
