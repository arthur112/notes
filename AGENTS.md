# Notes

A personal collection of **standalone, runnable notes** for techniques and patterns I want to keep. Each note is self-contained — you can open its folder and run it without anything else in the repo.

## Structure

```
notes/
├── AGENTS.md            # this file — repo conventions
└── <NoteName>/          # one folder per note (e.g. Grate/)
    ├── README.md        # what the note demonstrates + how to run it
    └── ...              # a complete, self-contained app or snippet
```

Conventions for every note folder:

- **One folder per technique/pattern**, named after the concept (PascalCase, e.g. `Grate`, `ResultMonad`).
- **Self-contained**: its own solution/project, its own dependencies, its own README. No cross-note references.
- **Runnable**: a new checkout of that single folder should build and run.
- **Documented**: a `README.md` at the note's root explaining the idea and the exact commands to run.
- **Persisted build state is ignored**: each note gitignores `bin/`, `obj/`, and any generated artifacts (e.g. `.sqlite` files).

## Notes

| Folder | Technique | Stack |
| --- | --- | --- |
| [`Grate/`](Grate/) | SQL-script database migrations with [grate](https://grate-devs.github.io/grate/) | .NET 10 console app, SQLite, EF Core |
| [`MailApi/`](MailApi/) | Centralised mail API with Liquid templates ([Fluid](https://github.com/sebastienros/fluid)) + SDK, with CID-embedded images and base64 attachments | .NET 10 minimal API, MailKit, SMTP |
| [`Custom-Provider/`](Custom-Provider/) | Encrypted-at-rest secrets via a custom `IConfigurationProvider` (DPAPI + certificate variants) | .NET 10 class library (NuGet), minimal API, DPAPI/RSA |
| [`ExcelImport/`](ExcelImport/) | Staging-layer import of wide txt/Excel files + normalization to 3NF, scaled with chunked background jobs | .NET 10, SQLite, EF Core, Sep, ExcelDataReader, FluentValidation, TickerQ |
| [`Parallelism/`](Parallelism/) | Parallel bulk-import of 2M-row wide txt files: TPL Dataflow pipeline inside a TickerQ job, SqlBulkCopy staging + set-based normalization, rejected-row dead-lettering with inspect/replay, job retries, BenchmarkDotNet | .NET 10, SQL Server (Docker), EF Core, Sep, TickerQ, TPL Dataflow, BenchmarkDotNet |
| [`Keycloak/`](Keycloak/) | OIDC/OAuth2 POC with a switchable identity provider (Keycloak container or ADFS): React SPA login (PKCE) via oidc-client-ts **and** a cookie-based BFF variant, the three-layer authorization model (scopes / roles / resource-based), user-token forwarding between APIs (shared audience), machine-to-machine client credentials — orchestrated by Aspire | Aspire 13, Keycloak (container) or ADFS, .NET 10 minimal APIs, React + Vite + oidc-client-ts |
| [`StranglerTable/`](StranglerTable/) | Strangler-fig migration of a wide unnormalized legacy table: normalized domain over one 44-column table via EF Core table splitting (owned types) vs. a hand-written anti-corruption layer, with a phase-2 physical table split | .NET 10 minimal API, EF Core, SQL Server (Docker) |
| [`Federation/`](Federation/) | Dashboard shell that loads micro-apps at runtime on click with true Module Federation (host + 2 separately-built remotes, shell services passed as props, IIS hosting), with a lazy-chunks-vs-MF decision table | React 19, Vite, @module-federation/vite, bun workspace |
| [`UxGuide/`](UxGuide/) | UX best practices for dense CRUD pages (30–50 fields) + a smart/dumb component-architecture contract, with the extraction realized: a Storybook 10 prototype of a company component library (`@company/ui`) built from the demo's unedited dumb components | React 19, Vite, Tailwind v4, shadcn/ui, TanStack Router/Table, react-hook-form + zod, Storybook 10 |
| [`DataMasking/`](DataMasking/) | Data masking at two levels: SQL Server dynamic data masking via per-request connection-string switching on an HttpContext identity property (engine-enforced) vs. an EF Core materialization interceptor + value converter masking `[Masked]` properties in .NET (app-enforced), with a trade-off table | Two .NET 10 minimal APIs, EF Core, SQL Server (Docker) |
| [`CentralLogging/`](CentralLogging/) | NuGet SDK package that configures Serilog + a batched HTTP sink to ship logs to a central service, with automatic W3C trace-ID correlation (Serilog 4 `Activity.Current`) and API-key auth via a custom sink `IHttpClient` | .NET 10 class library (NuGet), Serilog.AspNetCore, Serilog.Sinks.Http, minimal APIs |
| [`FederatedSlice/`](FederatedSlice/) | The federated React shell (two micro-apps over shared Orders/Customers domains, URL-as-filter Gridify lists, TanStack Form order form) plugged into a vertical-slice .NET 10 API (one file per use case, Result/`IHttpError` pipelines, built-in validation) whose slices mirror the front's domains, all started by Aspire: Gridify mappers over the front's filter field names (computed `lineCount`/`total`, UTC-day `DateOnly` converter), enum names end to end, separate create/update write paths sharing a C# 14 extension-block mapper, named OnCreate/OnChange/Always rules that silently override columns from per-customer settings, shown read-only in the list), field-level validation problems (keys camelCased to the form's paths), Keycloak OIDC sign-in (PKCE) in the shell with scope/role-gated UI, per-route scopes + user role on the API (config-driven JwtBearer, `dotnet user-jwts`, Scalar OAuth), grate schema + demo seed, Vite `/api` proxy, TUnit per-test-schema integration tests with signed test tokens, topic docs (filtering, forms, rules, OIDC) | Aspire 13, Keycloak (container), .NET 10 minimal API, EF Core + SQL Server, grate, Gridify, JwtBearer, TUnit, React 19 + Vite (bun), TanStack Router/Query/Form, oidc-client-ts |

## Working in this repo

- Add a new note by creating a new top-level folder following the conventions above.
- Each note is independent — you can `cd` into it and run it in isolation.
- See a note's own `README.md` for its run instructions; this file only describes the repo-wide layout.

Prefer spawning subagents for independent work: a scout (read-only recon) when the task names an area but not specific files, a researcher for web synthesis, and parallel subagent calls for independent investigations. Do the inline
   │ edits yourself — subagents are a context-protecting prefetch, not a substitute for working.
