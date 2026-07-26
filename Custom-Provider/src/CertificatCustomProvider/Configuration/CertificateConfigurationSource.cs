using System.Security.Cryptography.X509Certificates;
using Microsoft.Extensions.Configuration;

namespace CertificatCustomProvider.Configuration;

/// <summary>Source for <see cref="CertificateConfigurationProvider"/>.</summary>
public sealed class CertificateConfigurationSource : IConfigurationSource
{
    /// <summary>Path to the flat JSON file of base64 blobs.</summary>
    public required string Path { get; init; }

    /// <summary>Thumbprint of the certificate holding the RSA private key.</summary>
    public required string Thumbprint { get; init; }

    /// <summary>Store location to search. Defaults to <see cref="StoreLocation.LocalMachine"/>.</summary>
    public StoreLocation StoreLocation { get; init; } = StoreLocation.LocalMachine;

    /// <summary>Store name to search. Defaults to <see cref="StoreName.My"/>.</summary>
    public StoreName StoreName { get; init; } = StoreName.My;

    /// <inheritdoc />
    public IConfigurationProvider Build(IConfigurationBuilder builder) =>
        new CertificateConfigurationProvider(Path, Thumbprint, StoreLocation, StoreName);
}
