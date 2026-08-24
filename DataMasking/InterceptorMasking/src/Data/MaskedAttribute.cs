namespace InterceptorMasking.Data;

public enum MaskKind
{
    Default,
    Email,
    Phone,
    Zero,
    Iban
}

/// <summary>Marks a property as sensitive: masked at materialization for non-admin users.</summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class MaskedAttribute(MaskKind kind = MaskKind.Default) : Attribute
{
    public MaskKind Kind { get; } = kind;
}
