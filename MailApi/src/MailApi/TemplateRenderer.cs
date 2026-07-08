using System.Collections.Concurrent;
using Fluid;
using Fluid.Ast;

namespace MailApi;

/// <summary>
/// Parses Liquid templates from disk (cached by path + last-write-time) and renders them
/// against the supplied model.
/// </summary>
public sealed class TemplateRenderer
{
    private readonly FluidParser _parser = new();
    private readonly ConcurrentDictionary<string, (long tick, IFluidTemplate template)> _cache = new();

    public async Task<string> RenderAsync(string path, object model, CancellationToken ct = default)
    {
        var template = await GetOrParseAsync(path, ct);
        var context = new TemplateContext(model);
        return await template.RenderAsync(context);
    }

    private async Task<IFluidTemplate> GetOrParseAsync(string path, CancellationToken ct)
    {
        var tick = File.GetLastWriteTimeUtc(path).Ticks;
        if (_cache.TryGetValue(path, out var entry) && entry.tick == tick)
            return entry.template;

        var source = await File.ReadAllTextAsync(path, ct);
        if (!_parser.TryParse(source, out var template, out var error))
            throw new InvalidOperationException($"Liquid parse error in '{path}': {error}");

        _cache[path] = (tick, template);
        return template;
    }
}
