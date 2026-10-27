using System.ComponentModel.DataAnnotations;

namespace Api.Tests;

public static class RequestValidation
{
    public static List<ValidationResult> Validate(object instance)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(
            instance,
            new ValidationContext(instance),
            results,
            validateAllProperties: true
        );
        return results;
    }
}
