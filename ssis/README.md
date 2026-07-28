# ssis-extract

A single-file .NET tool that turns an SSIS `.dtsx` package into JSON, so you can
understand a package without opening it in Visual Studio / SSDT.

A `.dtsx` file is just XML — no SSIS runtime is needed. The tool walks the XML and
emits a hierarchical JSON document with:

- **connections** — name, type, connection string (passwords masked)
- **variables** — name, value, expression
- **tasks** — name, type, description, SQL statement, settings; nested containers
  are recursed
- **data flow** — per component: name, description, SQL query, properties,
  connection, output columns, and column mappings (resolved via `lineageId`
  references, so you see `People source.Name -> Name` instead of GUIDs)
- **flow** — precedence constraints (`from` / `to` / `value`)

## Run

```sh
dotnet run --project SsisExtract -- Sample.dtsx            # print to stdout
dotnet run --project SsisExtract -- Sample.dtsx -o out.json
dotnet run --project SsisExtract -- Sample.dtsx --compact
```

`Sample.dtsx` is a small hand-written package (Execute SQL task + data flow with
OLE DB source → Derived Column → OLE DB destination) so the tool can be tried
without a real SSIS project.

## Code

Everything lives in `SsisExtract/Program.cs` (~150 lines): a
`System.CommandLine` wrapper plus three local functions that convert the XML
into `JsonNode`s. There are deliberately no model classes — the JSON shape is
defined directly by the conversion code.
