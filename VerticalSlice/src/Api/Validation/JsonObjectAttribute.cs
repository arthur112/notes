using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace Api.Validation;

public sealed class JsonObjectAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext) =>
        value is null or JsonElement { ValueKind: JsonValueKind.Object }
            ? ValidationResult.Success
            : new ValidationResult(
                $"The specified condition was not met for '{validationContext.DisplayName}'.",
                [validationContext.MemberName!]
            );
}
