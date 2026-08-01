using FluentValidation;
using System.Globalization;

namespace ExcelImport.Transform.Orders;

public class OrderRowValidator : AbstractValidator<OrderImportRow>
{
    public OrderRowValidator()
    {
        RuleFor(x => x.Date)
            .Must(BeAValidDate).WithMessage(x => $"Invalid date '{x.Date}'");

        RuleFor(x => x.CustomerName)
            .NotEmpty().WithMessage("CustomerName is required");

        RuleFor(x => x)
            .Must(HasAnyLine).WithMessage("Row contains no order lines");

        RuleFor(x => x).Custom(ValidateSlots);
    }

    private static bool BeAValidDate(string date) =>
        DateOnly.TryParse(date, CultureInfo.InvariantCulture, out _);

    private static bool HasAnyLine(OrderImportRow row) =>
        row.Slots().Any(s => !OrderImportRow.IsEmpty(s.Product, s.Qty, s.Price));

    private static void ValidateSlots(OrderImportRow row, ValidationContext<OrderImportRow> context)
    {
        foreach (var (slot, product, qty, price) in row.Slots())
        {
            if (OrderImportRow.IsEmpty(product, qty, price))
            {
                continue;
            }

            if (string.IsNullOrWhiteSpace(product))
            {
                context.AddFailure($"Product{slot}", $"Product{slot} is empty but Qty{slot}/Price{slot} are set");
            }
            if (!int.TryParse(qty, NumberStyles.Integer, CultureInfo.InvariantCulture, out var quantity) || quantity <= 0)
            {
                context.AddFailure($"Qty{slot}", $"Qty{slot} '{qty}' is not a positive integer");
            }
            if (!decimal.TryParse(price, NumberStyles.Number, CultureInfo.InvariantCulture, out var unitPrice) || unitPrice < 0)
            {
                context.AddFailure($"Price{slot}", $"Price{slot} '{price}' is not a valid amount");
            }
        }
    }
}
