using System.Net.Http.Headers;
using Microsoft.Extensions.Configuration;
using Serilog.Sinks.Http;

namespace CentralLogging.Sdk;

/// <summary>
/// <see cref="IHttpClient"/> for the Serilog HTTP sink. This is the seam where cross-cutting
/// concerns live — here it attaches the API key as an <c>X-Api-Key</c> header on every batch POST.
/// </summary>
internal sealed class CentralLoggingHttpClient(string? apiKey) : IHttpClient
{
    private readonly HttpClient _client = new();

    public void Configure(IConfiguration configuration)
    {
        // Called by the sink when it is configured via appsettings.json; unused here.
    }

    public Task<HttpResponseMessage> PostAsync(string requestUri, Stream contentStream, CancellationToken cancellationToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, requestUri)
        {
            Content = new StreamContent(contentStream)
        };
        request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

        if (!string.IsNullOrWhiteSpace(apiKey))
            request.Headers.TryAddWithoutValidation("X-Api-Key", apiKey);

        return _client.SendAsync(request, cancellationToken);
    }

    public void Dispose() => _client.Dispose();
}
