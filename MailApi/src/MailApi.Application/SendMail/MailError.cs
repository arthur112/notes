namespace MailApi.Application.SendMail;

public sealed record MailError(MailErrorType Type, string Message, Exception? Exception = null)
{
    public static MailError Validation(string message) => new(MailErrorType.Validation, message);

    public static MailError TemplateInvalid(string message, Exception? exception = null) =>
        new(MailErrorType.TemplateInvalid, message, exception);

    public static MailError TemplateUnavailable(Exception exception) =>
        new(MailErrorType.TemplateUnavailable, "The template could not be read.", exception);

    public static MailError Delivery(Exception exception) =>
        new(MailErrorType.Delivery, "SMTP delivery failed.", exception);
}

public enum MailErrorType
{
    Validation,
    TemplateInvalid,
    TemplateUnavailable,
    Delivery,
}
