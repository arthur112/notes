namespace DemoApi;

public sealed class ConnectionStringsOptions
{
    public string? MainDb { get; init; }
}

public sealed class ExternalApiOptions
{
    public string? ApiKey { get; init; }
}
