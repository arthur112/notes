using ExcelImport.Staging;
using FluentValidation.Results;

namespace ExcelImport.Transform;

public static class ImportRowExtensions
{
    public static void Fail(this ImportRow row, ValidationResult result) =>
        row.Fail(string.Join("; ", result.Errors.Select(e => e.ErrorMessage)));

    public static void Fail(this ImportRow row, string error)
    {
        row.Status = RowStatus.Failed;
        row.Error = error;
    }

    public static void Succeed(this ImportRow row)
    {
        row.Status = RowStatus.Processed;
        row.Error = null;
    }
}
