using System.Reflection;
using InterceptorMasking.Auth;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace InterceptorMasking.Data;

/// <summary>
/// Masks properties marked with [Masked] right after EF materializes an entity,
/// unless the current user is an admin. Runs inside EF's query pipeline, so every
/// LINQ query, Find, lazy load, etc. through this context is covered.
/// Uses InitializedInstance: CreatedInstance fires *before* property values are
/// populated, so masks written there would be overwritten by the real values.
/// </summary>
public sealed class MaskingInterceptor(ICurrentUser currentUser) : IMaterializationInterceptor
{
    public object InitializedInstance(MaterializationInterceptionData materializationData, object instance)
    {
        if (currentUser.IsAdmin)
            return instance;

        foreach (var prop in instance.GetType().GetProperties())
        {
            var mask = prop.GetCustomAttribute<MaskedAttribute>();
            if (mask is null || !prop.CanWrite)
                continue;

            prop.SetValue(instance, Maskers.Apply(mask.Kind, prop.GetValue(instance)));
        }

        return instance;
    }
}
