using System.ComponentModel.DataAnnotations;

namespace Api.Validation;

public sealed class NotEmptyStringAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext) =>
        value is string s && !string.IsNullOrWhiteSpace(s)
            ? ValidationResult.Success
            : new ValidationResult(
                $"'{validationContext.DisplayName}' must not be empty.",
                [validationContext.MemberName!]
            );
}
