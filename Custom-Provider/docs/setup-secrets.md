# Setting up secrets

## Required secret keys

| Key | Purpose |
| --- | --- |
| `ConnectionStrings:MainDb` | Main database connection string |
| `ExternalApi:ApiKey` | API key for the external service |

Key names must match exactly between User Secrets (dev) and the encrypted file (prod) — the provider is just another `IConfiguration` source.

## Development (any OS)

Uses [User Secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets) — nothing encrypted on disk, no DPAPI involved:

```bash
cd demo/DemoApi
dotnet user-secrets set "ConnectionStrings:MainDb" "Server=dev;Database=app"
dotnet user-secrets set "ExternalApi:ApiKey" "dev-key-123"
dotnet run
```

## Production (Windows/IIS, single server — DPAPI)

1. On your workstation, create `secrets.plain.json`:

   ```json
   {
     "ConnectionStrings:MainDb": "Server=prod;Database=app;...",
     "ExternalApi:ApiKey": "prod-key-..."
   }
   ```

2. Copy it to the target IIS server and run the tool **there** (DPAPI blobs are machine-bound):

   ```
   EncryptSecrets.exe dpapi secrets.plain.json secrets.encrypted.json
   ```

3. Deploy `secrets.encrypted.json` to the app's content root (next to the DLLs). It is safe to commit to source control.
4. **Delete `secrets.plain.json` from the server.**
5. Ensure the site's environment is `Production` so `AddDpapiFile` runs.

The app pool identity needs no extra permissions — `LocalMachine`-scope DPAPI is available to any process on that machine.

## Production (multi-server — certificate variant)

DPAPI cannot travel between machines. For web farms:

1. Install one certificate (with private key) into `LocalMachine\My` on **every** target server.
2. ACL the private key to each app pool identity: certlm.msc → certificate → All Tasks → Manage Private Keys → add `IIS AppPool\<PoolName>` (read).
3. Put the thumbprint in non-secret config, e.g. `appsettings.Production.json`: `"Secrets": { "CertificateThumbprint": "AB12..." }`.
4. Swap the provider call in `Program.cs` from `AddDpapiFile` to `AddCertificateFile` (commented example in the code).
5. Encrypt with the public key — this can run anywhere the cert is installed:

   ```
   EncryptSecrets.exe cert secrets.plain.json secrets.encrypted.json AB12CD34...
   ```

Only the provider call and the encryption command change; consumption code is untouched.
