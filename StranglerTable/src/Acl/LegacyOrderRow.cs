namespace StranglerTable.Acl;

public class LegacyOrderRow
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = "";
    public DateTime OrderDate { get; set; }
    public string Status { get; set; } = "";
    public string Channel { get; set; } = "";
    public string Currency { get; set; } = "";
    public decimal SubTotal { get; set; }
    public decimal Tax { get; set; }
    public decimal ShippingCost { get; set; }
    public string? Notes { get; set; }
    public bool IsGift { get; set; }
    public bool NewsletterOptIn { get; set; }

    public string CustomerRef { get; set; } = "";
    public string CustomerFirstName { get; set; } = "";
    public string CustomerLastName { get; set; } = "";
    public string CustomerEmail { get; set; } = "";
    public string? CustomerPhone { get; set; }
    public string? CustomerCompany { get; set; }
    public string? CustomerVatNumber { get; set; }
    public string CustomerSegment { get; set; } = "";

    public string BillingStreet { get; set; } = "";
    public string? BillingStreet2 { get; set; }
    public string BillingCity { get; set; } = "";
    public string BillingZip { get; set; } = "";
    public string? BillingState { get; set; }
    public string BillingCountry { get; set; } = "";

    public string ShippingStreet { get; set; } = "";
    public string? ShippingStreet2 { get; set; }
    public string ShippingCity { get; set; } = "";
    public string ShippingZip { get; set; } = "";
    public string? ShippingState { get; set; }
    public string ShippingCountry { get; set; } = "";

    public string? Carrier { get; set; }
    public string? TrackingNumber { get; set; }
    public DateTime? ShippedDate { get; set; }
    public DateTime? DeliveredDate { get; set; }
    public bool RequiresSignature { get; set; }

    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = "";
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }

    public string? LegacyCode { get; set; }
    public bool LegacyFlag { get; set; }
    public decimal LegacyDiscount { get; set; }
}
