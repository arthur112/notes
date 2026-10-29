namespace Api.Features.SampleRecord;

/// <summary>
/// Plain 1:1 column copies, no business logic (that lives in <see cref="SampleRecordRules"/>).
/// <c>Id</c>, <c>PublicId</c> and the audit columns are never written here: the database and
/// <see cref="Api.Data.AuditInterceptor"/> own them.
/// </summary>
public static class SampleRecordMapper
{
    extension(SampleRecordEntity target)
    {
        public void MapFrom(CreateSampleRecord.Request request)
        {
            target.ExternalKey = request.ExternalKey;
            target.Type = request.Type;
            target.CustId = request.CustId;
            target.Priority = request.Priority;
            target.Currency = request.Currency;
            target.PaymentTermDays = request.PaymentTermDays;
            target.EdiCode = request.EdiCode;
            target.EdiPartner = request.EdiPartner;
            target.Description = request.Description;
            target.Reference = request.Reference;
            target.Amount = request.Amount;
            target.Quantity = request.Quantity;
            target.OrderDate = request.OrderDate;
            target.DueDate = request.DueDate;
        }

        /// <summary><c>ExternalKey</c> is the business key and is not editable.</summary>
        public void MapFrom(UpdateSampleRecord.Request request)
        {
            target.Type = request.Type;
            target.CustId = request.CustId;
            target.Priority = request.Priority;
            target.Currency = request.Currency;
            target.PaymentTermDays = request.PaymentTermDays;
            target.EdiCode = request.EdiCode;
            target.EdiPartner = request.EdiPartner;
            target.Description = request.Description;
            target.Reference = request.Reference;
            target.Amount = request.Amount;
            target.Quantity = request.Quantity;
            target.OrderDate = request.OrderDate;
            target.DueDate = request.DueDate;
        }

        public void MapFrom(SampleRecordExcelRow row)
        {
            target.ExternalKey = row.ExternalKey;
            target.Type = row.Type;
            target.CustId = row.CustId;
            target.Priority = row.Priority;
            target.Currency = row.Currency;
            target.PaymentTermDays = row.PaymentTermDays;
            target.EdiCode = row.EdiCode;
            target.EdiPartner = row.EdiPartner;
            target.Description = row.Description;
            target.Reference = row.Reference;
            target.Amount = row.Amount;
            target.Quantity = row.Quantity;
            target.OrderDate = row.OrderDate;
            target.DueDate = row.DueDate;
        }

        public SampleRecordResponse ToResponse() =>
            new(
                target.PublicId,
                target.ExternalKey,
                target.Type,
                target.CustId,
                target.Priority,
                target.Currency,
                target.PaymentTermDays,
                target.EdiCode,
                target.EdiPartner,
                target.Description,
                target.Reference,
                target.Amount,
                target.Quantity,
                target.OrderDate,
                target.DueDate,
                target.CreatedAt,
                target.UpdatedAt
            );
    }
}
