using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace InterceptorMasking.Data;

/// <summary>
/// Value-converter masks. Unlike the materialization interceptor, a converter runs
/// at the column level whenever EF reads the value from the provider — so it also
/// covers DTO projections (Select(e => new Dto { ... })), which never materialize
/// an entity and therefore bypass IMaterializationInterceptor.
///
/// Caveat: converters are baked into the model, and the model is cached — a
/// user-dependent converter requires a custom IModelCacheKeyFactory (see
/// UserAwareModelCacheKeyFactory) so admin and non-admin get separate models.
/// </summary>
public static class MaskingConverters
{
    public static ValueConverter<string?, string?> For(MaskKind kind) =>
        new(
            convertToProviderExpression: v => v,                        // writes stay clear
            convertFromProviderExpression: v => (string?)Maskers.Apply(kind, v)); // reads get masked
}
