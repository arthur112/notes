namespace Api.Data;

/// <summary>Columns stamped by <see cref="AuditInterceptor"/>, never by handlers or rules.</summary>
public interface IAuditable
{
    DateTimeOffset CreatedAt { get; set; }
    DateTimeOffset UpdatedAt { get; set; }
}
