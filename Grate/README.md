# Grate note

A self-contained .NET console app demonstrating the **[grate](https://grate-devs.github.io/grate/)** SQL-script migration pattern against **SQLite**, verified with **EF Core** LINQ queries.

grate owns the schema (plain `.sql` files in well-known folders); EF Core only reads/writes the resulting tables — no EF migrations, no `EnsureCreated`.

## Layout

```
Grate/
├── .config/dotnet-tools.json      # grate pinned as a local tool
├── src/
│   ├── Program.cs                 # runs grate, then EF Core LINQ queries
│   ├── Entities/{Blog,Post}.cs
│   ├── Data/BloggingContext.cs    # DbContext over grate-created tables
│   ├── db/                        # notes.sqlite lands here (gitignored)
│   └── Migrations/up/             # grate one-time DDL folder
│       ├── 0001-Create-Blogs.sql
│       └── 0002-Create-Posts.sql
└── README.md
```

## Run it

```bash
cd Grate
dotnet tool restore          # installs grate from the local manifest
dotnet run --project src     # migrate (if needed) + verify with EF Core
```

On launch `Program.cs`:

1. (only with `--reset`) deletes `db/notes.sqlite` for a clean slate;
2. invokes `dotnet grate --connstring "Data Source=db/notes.sqlite" --dbt sqlite --files Migrations --silent --create` — grate **skips** scripts already recorded in `grate_ScriptsRun`, so a plain `dotnet run` is idempotent;
3. seeds a `Blog` + `Posts` only if the table is empty;
4. runs three LINQ queries to verify the grate-created schema maps to the entities.

`dotnet run --project src -- --reset` wipes the DB first so you can watch grate run the scripts from scratch.

## How grate works here

grate processes well-known folders in a fixed order; files run alphabetically. We only use `up/` (one-time scripts that run exactly once per database). See https://grate-devs.github.io/grate/getting-started/ for the full folder catalogue.
