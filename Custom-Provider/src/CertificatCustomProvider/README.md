# CertificatCustomProvider

Encrypted JSON configuration providers for ASP.NET Core on IIS.

- `AddDpapiFile(path)` — values encrypted with `ProtectedData.Protect` (`LocalMachine` scope, Windows-only, machine-bound).
- `AddCertificateFile(path, thumbprint)` — values encrypted with the public key of a certificate in `LocalMachine\My` using RSA-OAEP-SHA256.

Both read a flat JSON file: `{ "Some:Key": "<base64 blob>", ... }` and expose the decrypted values through `IConfiguration` with case-insensitive keys.
