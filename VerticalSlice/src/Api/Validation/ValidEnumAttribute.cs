using System.ComponentModel.DataAnnotations;
using Api.Features.Fund;

namespace Api.Validation;

public sealed class ValidEnumAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        var valid = value switch
        {
            null => true,
            Periodicity v => PeriodicityExtensions.IsDefined(v),
            _ => Enum.IsDefined(value.GetType(), value),
        };

        if (valid)
            return ValidationResult.Success;

        return new ValidationResult(
            $"'{validationContext.DisplayName}' has a range of values which does not include '{value}'.",
            [validationContext.MemberName!]
        );
    }
}
