# Custom-Provider note

Encrypted configuration for ASP.NET Core on IIS: production secrets are stored **encrypted at rest** in a flat JSON file, decrypted by a custom `IConfigurationProvider`. Local dev keeps using **User Secrets** — business code only ever sees `IConfiguration`.

Two provider variants ship in the same NuGet library:

| Variant | Extension | Binding | Use when |
| --- | --- | --- | --- |
| DPAPI | `AddDpapiFile(path)` | machine-bound (`ProtectedData`, `LocalMachine` scope, Windows-only) | single-server deployment |
| Certificate | `AddCertificateFile(path, thumbprint)` | RSA-OAEP-SHA256 against a cert in `LocalMachine\My` | multi-server deployment |

Both read the same flat format: `{ "Some:Key": "<base64 blob>", ... }` → decrypted values land in `IConfiguration` with case-insensitive keys.

## Layout

```
Custom-Provider/
├── Custom-Provider.slnx
├── nuget.config                    # adds local feed: artifacts/nuget
├── src/
│   └── CertificatCustomProvider/   # the NuGet library (both providers + extensions)
├── tools/
│   └── EncryptSecrets/             # console tool: plain JSON -> encrypted JSON
├── demo/
│   └── DemoApi/                    # minimal web API consuming the library as a package
└── docs/
    └── setup-secrets.md            # required keys + dev/prod workflows
```

## How it works

`demo/DemoApi/Program.cs` adds the provider **after** the default sources, only in Production, so it overrides `appsettings.json`:

```csharp
if (builder.Environment.IsProduction())
{
    builder.Configuration.AddDpapiFile(
        Path.Combine(builder.Environment.ContentRootPath, "secrets.encrypted.json"));
}
```

Secrets are then consumed through the **Options pattern** with fail-fast validation at startup (`ValidateOnStart` — the host refuses to boot on a missing/mis-encrypted secret):

```csharp
builder.Services.AddOptions<ConnectionStringsOptions>()
    .Bind(builder.Configuration.GetSection("ConnectionStrings"))
    .Validate(o => !string.IsNullOrWhiteSpace(o.MainDb), "ConnectionStrings:MainDb missing")
    .ValidateOnStart();
```

No `#if DEBUG`, no environment branching anywhere else — everything flows through `IConfiguration`.

## Run it (Development — works on any OS)

The demo consumes the library **as a NuGet package** from a local feed, so pack it first:

```bash
cd Custom-Provider
dotnet pack src/CertificatCustomProvider -o artifacts/nuget

cd demo/DemoApi
dotnet user-secrets set "ConnectionStrings:MainDb" "Server=dev;Database=app"
dotnet user-secrets set "ExternalApi:ApiKey" "dev-key-123"
dotnet run 
```

- `GET /` — shows both secrets resolved, masked.
- `GET /diag/config-source` — Development only; reports which provider supplies `ConnectionStrings:MainDb`.

If you change the library, re-pack and either bump `Version` or clear the cached package:

```bash
dotnet pack src/CertificatCustomProvider -o artifacts/nuget
dotnet nuget locals global-packages --clear   # or bump Version in the csproj
```

## Run it (Production — Windows/IIS only)

DPAPI blobs are machine-bound, so encryption happens **on the target IIS server**:

```
EncryptSecrets.exe dpapi secrets.plain.json secrets.encrypted.json
```

Then deploy `secrets.encrypted.json` next to the app, **delete `secrets.plain.json`**, and set `ASPNETCORE_ENVIRONMENT=Production` on the site. See [`tools/EncryptSecrets/README.md`](tools/EncryptSecrets/README.md) and [`docs/setup-secrets.md`](docs/setup-secrets.md).

## Repo hygiene

- `secrets.plain.json` is gitignored; `secrets.encrypted.json` is safe to commit.
- `appsettings.json` / `appsettings.Production.json` contain no secrets — grep the repo to verify.
