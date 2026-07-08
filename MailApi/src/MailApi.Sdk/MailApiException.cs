namespace MailApi.Sdk;

public sealed class MailApiException : Exception
{
    public int StatusCode { get; }
    public string? ErrorBody { get; }

    public MailApiException(int statusCode, string? errorBody)
        : base($"Mail API returned {(System.Net.HttpStatusCode)statusCode}: {errorBody}")
    {
        StatusCode = statusCode;
        ErrorBody = errorBody;
    }
}
