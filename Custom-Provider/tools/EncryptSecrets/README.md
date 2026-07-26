# EncryptSecrets

Turns a flat plain-text JSON secrets file into the encrypted flat JSON file consumed by the `CertificatCustomProvider` configuration providers.

## Input format

```json
{
  "ConnectionStrings:MainDb": "Server=...;Database=...;...",
  "ExternalApi:ApiKey": "super-secret"
}
```

## DPAPI mode (default for single-server IIS)

DPAPI blobs are **machine-bound** — run this **on the target IIS server**, as any user:

```
dotnet run --project tools/EncryptSecrets -- dpapi secrets.plain.json secrets.encrypted.json
```

or publish and copy the exe to the server:

```
dotnet publish tools/EncryptSecrets -c Release -r win-x64 --self-contained
EncryptSecrets.exe dpapi secrets.plain.json secrets.encrypted.json
```

Then:

1. Copy `secrets.encrypted.json` next to the deployed app (`ContentRootPath`) — it is safe to commit.
2. **Delete `secrets.plain.json`** from the server.

## Certificate mode (multi-server / DPAPI alternative)

Uses only the certificate **public key**, so it can run anywhere the cert (or its `.cer`) is installed:

```
EncryptSecrets.exe cert secrets.plain.json secrets.encrypted.json <thumbprint>
```

The certificate with its **private key** must be in `LocalMachine\My` on each target server, ACL'd to `IIS AppPool\<PoolName>`.

## Security notes

- Never commit `secrets.plain.json` (it is gitignored at the note root).
- Delete the plain input file from the server immediately after encryption.
