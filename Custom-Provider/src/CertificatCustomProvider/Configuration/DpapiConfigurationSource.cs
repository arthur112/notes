using Microsoft.Extensions.Configuration;

namespace CertificatCustomProvider.Configuration;

/// <summary>Source for <see cref="DpapiConfigurationProvider"/>.</summary>
public sealed class DpapiConfigurationSource : IConfigurationSource
{
    /// <summary>Path to the flat JSON file of base64 DPAPI blobs.</summary>
    public required string Path { get; init; }

    /// <inheritdoc />
    public IConfigurationProvider Build(IConfigurationBuilder builder) =>
        new DpapiConfigurationProvider(Path);
}
