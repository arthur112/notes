using FluentValidation;
using System.Globalization;

namespace ExcelImport.Transform.Inventory;

public class InventoryRowValidator : AbstractValidator<InventoryImportRow>
{
    public InventoryRowValidator()
    {
        RuleFor(x => x.Sku)
            .NotEmpty().WithMessage("SKU is required");

        RuleFor(x => x.Warehouse)
            .NotEmpty().WithMessage("Warehouse is required");

        RuleFor(x => x.OnHand)
            .Must(BeNonNegativeInt).WithMessage(x => $"OnHand '{x.OnHand}' is not a non-negative integer");

        RuleFor(x => x.ReorderLevel)
            .Must(BeEmptyOrNonNegativeInt).WithMessage(x => $"ReorderLevel '{x.ReorderLevel}' is not a non-negative integer");
    }

    private static bool BeNonNegativeInt(string value) =>
        int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var n) && n >= 0;

    private static bool BeEmptyOrNonNegativeInt(string value) =>
        string.IsNullOrWhiteSpace(value) || BeNonNegativeInt(value);
}
