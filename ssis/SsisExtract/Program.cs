using System.CommandLine;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Xml.Linq;

var pathArg = new Argument<FileInfo>("path") { Description = "Path to the .dtsx package file" };
var outputOpt = new Option<FileInfo?>("--output", "-o")
{
    Description = "Write JSON to this file instead of stdout",
};
var compactOpt = new Option<bool>("--compact")
{
    Description = "Emit compact JSON without indentation",
};

var root = new RootCommand("Extracts the structure of an SSIS .dtsx package into JSON.")
{
    pathArg,
    outputOpt,
    compactOpt,
};

root.SetAction(r =>
{
    var path = r.GetValue(pathArg)!;
    if (!path.Exists)
    {
        Console.Error.WriteLine($"File not found: {path.FullName}");
        return 1;
    }
    try
    {
        Run(path.FullName, r.GetValue(outputOpt), r.GetValue(compactOpt));
        return 0;
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"Failed to parse: {ex.Message}");
        return 1;
    }
});
return root.Parse(args).Invoke();

static void Run(string path, FileInfo? output, bool compact)
{
    XNamespace dts = "www.microsoft.com/SqlServer/Dts";
    string? A(XElement? el, string name) => el?.Attribute(dts + name)?.Value;

    var doc = XDocument.Load(path);
    var pkg = doc.Root ?? throw new InvalidDataException("Empty dtsx document.");
    if (pkg.Name != dts + "Executable")
        throw new InvalidDataException("Not a dtsx package.");

    var connNames = new Dictionary<string, string>();
    var connections = new JsonArray();
    foreach (
        var cm in pkg.Element(dts + "ConnectionManagers")?.Elements(dts + "ConnectionManager") ?? []
    )
    {
        var id = A(cm, "DTSID");
        var name = A(cm, "ObjectName");
        if (id is not null && name is not null)
            connNames[id] = name;
        var cs = A(
            cm.Element(dts + "ObjectData")?.Element(dts + "ConnectionManager"),
            "ConnectionString"
        );
        connections.Add(
            new JsonObject
            {
                ["name"] = name,
                ["type"] = A(cm, "CreationName"),
                ["connectionString"] = cs is null
                    ? null
                    : Regex.Replace(cs, @"(?i)((?:password|pwd)\s*=)[^;]*", "$1***"),
            }
        );
    }
    string ConnName(string raw) => connNames.TryGetValue(raw.Split(':')[0], out var n) ? n : raw;

    JsonObject TaskToJson(XElement el)
    {
        var o = new JsonObject
        {
            ["name"] = A(el, "ObjectName"),
            ["type"] = A(el, "ExecutableType"),
            ["description"] = A(el, "Description"),
        };

        var data = el.Element(dts + "ObjectData")?.Elements().FirstOrDefault();
        if (data is not null && data.Name.LocalName == "pipeline")
            o["dataFlow"] = PipelineToJson(data);
        else if (data is not null)
        {
            var settings = new JsonObject();
            foreach (var a in data.Attributes().Where(a => !a.IsNamespaceDeclaration))
                settings[a.Name.LocalName] = a.Name.LocalName.Contains("Connection")
                    ? ConnName(a.Value)
                    : a.Value;
            if (settings["SqlStatementSource"] is JsonValue sql)
            {
                o["sql"] = sql.GetValue<string>();
                settings.Remove("SqlStatementSource");
            }
            if (settings.Count > 0)
                o["settings"] = settings;
        }

        var children = el.Element(dts + "Executables")
            ?.Elements(dts + "Executable")
            .Select(TaskToJson)
            .ToArray();
        if (children is { Length: > 0 })
            o["tasks"] = new JsonArray(children);
        return o;
    }

    JsonObject PipelineToJson(XElement pipe)
    {
        var lineage = new Dictionary<string, string>(); // lineageId -> "Component.Column"
        var endpoints = new Dictionary<string, string>(); // input/output id -> "Component.Name"
        var comps = new JsonArray();

        foreach (var c in pipe.Element("components")?.Elements("component") ?? [])
        {
            var name = c.Attribute("name")?.Value;
            var comp = new JsonObject
            {
                ["name"] = name,
                ["description"] = c.Attribute("description")?.Value,
                ["componentClassId"] = c.Attribute("componentClassID")?.Value,
            };

            var props = new JsonObject();
            foreach (var p in c.Element("properties")?.Elements("property") ?? [])
                if (
                    p.Attribute("name")?.Value is { } pn
                    && !p.Elements().Any()
                    && p.Value.Length > 0
                )
                    props[pn] = p.Value;
            if (props["SqlCommand"] is JsonValue sql)
            {
                comp["sql"] = sql.GetValue<string>();
                props.Remove("SqlCommand");
            }
            if (props.Count > 0)
                comp["properties"] = props;

            var conns = (c.Element("connections")?.Elements("connection") ?? [])
                .Select(x => x.Attribute("connectionManagerID")?.Value)
                .Where(v => v is not null)
                .ToArray();
            if (conns.Length > 0)
                comp["connections"] = new JsonArray(
                    conns.Select(v => (JsonNode)ConnName(v!)).ToArray()
                );

            foreach (var oEl in c.Element("outputs")?.Elements("output") ?? [])
            {
                var oid = oEl.Attribute("id")?.Value;
                if (oid is not null)
                    endpoints[oid] = $"{name}.{oEl.Attribute("name")?.Value}";
                var cols = new JsonArray();
                foreach (var col in oEl.Element("outputColumns")?.Elements("outputColumn") ?? [])
                {
                    var colName = col.Attribute("name")?.Value;
                    if (col.Attribute("lineageId")?.Value is { } lid)
                        lineage.TryAdd(lid, $"{name}.{colName}");
                    cols.Add(
                        new JsonObject
                        {
                            ["name"] = colName,
                            ["type"] = col.Attribute("dataType")?.Value,
                        }
                    );
                }
                if (cols.Count > 0)
                    (comp["outputs"] ??= new JsonArray())
                        .AsArray()
                        .Add(
                            new JsonObject
                            {
                                ["name"] = oEl.Attribute("name")?.Value,
                                ["columns"] = cols,
                            }
                        );
            }

            var mappings = new JsonArray();
            foreach (var iEl in c.Element("inputs")?.Elements("input") ?? [])
            {
                var iid = iEl.Attribute("id")?.Value;
                if (iid is not null)
                    endpoints[iid] = $"{name}.{iEl.Attribute("name")?.Value}";
                var external = (
                    iEl.Element("externalMetadataColumns")?.Elements("externalMetadataColumn") ?? []
                ).ToDictionary(
                    e => e.Attribute("id")?.Value ?? "",
                    e => e.Attribute("name")?.Value
                );
                foreach (var col in iEl.Element("inputColumns")?.Elements("inputColumn") ?? [])
                {
                    if (col.Attribute("lineageId")?.Value is not { } src)
                        continue;
                    var target =
                        external.GetValueOrDefault(
                            col.Attribute("externalMetadataColumnId")?.Value ?? ""
                        ) ?? col.Attribute("cachedName")?.Value;
                    mappings.Add(new JsonObject { ["sourceLineageId"] = src, ["target"] = target });
                }
            }
            if (mappings.Count > 0)
                comp["mappings"] = mappings;
            comps.Add(comp);
        }

        // resolve lineage ids now that all outputs are known
        foreach (var comp in comps.Cast<JsonObject>())
            if (comp["mappings"] is JsonArray ms)
                foreach (var m in ms.Cast<JsonObject>())
                    if (lineage.TryGetValue(m["sourceLineageId"]!.GetValue<string>(), out var src))
                    {
                        m["source"] = src;
                        m.Remove("sourceLineageId");
                    }

        var paths = new JsonArray();
        foreach (var p in pipe.Element("paths")?.Elements("path") ?? [])
            paths.Add(
                new JsonObject
                {
                    ["from"] = endpoints.GetValueOrDefault(p.Attribute("startId")?.Value ?? ""),
                    ["to"] = endpoints.GetValueOrDefault(p.Attribute("endId")?.Value ?? ""),
                }
            );

        var flow = new JsonObject { ["components"] = comps };
        if (paths.Count > 0)
            flow["paths"] = paths;
        return flow;
    }

    var variables = new JsonArray();
    foreach (var v in pkg.Element(dts + "Variables")?.Elements(dts + "Variable") ?? [])
        variables.Add(
            new JsonObject
            {
                ["name"] = A(v, "ObjectName") ?? A(v, "Name"),
                ["value"] = v.Element(dts + "VariableValue")?.Value,
                ["expression"] = v.Elements(dts + "Property")
                    .FirstOrDefault(p => p.Attribute(dts + "Name")?.Value == "Expression")
                    ?.Value,
            }
        );

    var flow2 = new JsonArray();
    foreach (
        var pc in pkg.Element(dts + "PrecedenceConstraints")?.Elements(dts + "PrecedenceConstraint")
            ?? []
    )
        flow2.Add(
            new JsonObject
            {
                ["from"] = A(pc, "From"),
                ["to"] = A(pc, "To"),
                ["value"] = pc.Elements(dts + "Property")
                    .FirstOrDefault(p => p.Attribute(dts + "Name")?.Value == "Value")
                    ?.Value,
            }
        );

    var result = new JsonObject
    {
        ["name"] = A(pkg, "ObjectName"),
        ["description"] = A(pkg, "Description"),
        ["connections"] = connections,
        ["variables"] = variables,
        ["tasks"] = new JsonArray(
            (pkg.Element(dts + "Executables")?.Elements(dts + "Executable") ?? [])
                .Select(TaskToJson)
                .ToArray()
        ),
        ["flow"] = flow2,
    };

    var json = result.ToJsonString(new JsonSerializerOptions { WriteIndented = !compact });
    if (output is null)
        Console.Out.WriteLine(json);
    else
    {
        File.WriteAllText(output.FullName, json);
        Console.Error.WriteLine($"Wrote {output.FullName}");
    }
}
