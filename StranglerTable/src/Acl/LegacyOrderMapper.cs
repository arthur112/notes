using StranglerTable.Domain;

namespace StranglerTable.Acl;

public static class LegacyOrderMapper
{
    public static Order ToDomain(LegacyOrderRow row) => new()
    {
        Id = row.Id,
        OrderNumber = row.OrderNumber,
        OrderDate = row.OrderDate,
        Status = Enum.Parse<OrderStatus>(row.Status),
        Channel = row.Channel,
        Currency = row.Currency,
        SubTotal = row.SubTotal,
        Tax = row.Tax,
        ShippingCost = row.ShippingCost,
        Notes = row.Notes,
        IsGift = row.IsGift,
        NewsletterOptIn = row.NewsletterOptIn,
        Customer = new Customer
        {
            ExternalRef = row.CustomerRef,
            FirstName = row.CustomerFirstName,
            LastName = row.CustomerLastName,
            Email = row.CustomerEmail,
            Phone = row.CustomerPhone,
            Company = row.CustomerCompany,
            VatNumber = row.CustomerVatNumber,
            Segment = row.CustomerSegment
        },
        BillingAddress = new Address
        {
            Street = row.BillingStreet,
            Street2 = row.BillingStreet2,
            City = row.BillingCity,
            Zip = row.BillingZip,
            State = row.BillingState,
            Country = row.BillingCountry
        },
        ShippingAddress = new Address
        {
            Street = row.ShippingStreet,
            Street2 = row.ShippingStreet2,
            City = row.ShippingCity,
            Zip = row.ShippingZip,
            State = row.ShippingState,
            Country = row.ShippingCountry
        },
        Fulfillment = new Fulfillment
        {
            Carrier = row.Carrier,
            TrackingNumber = row.TrackingNumber,
            ShippedDate = row.ShippedDate,
            DeliveredDate = row.DeliveredDate,
            RequiresSignature = row.RequiresSignature
        },
        Audit = new Audit
        {
            CreatedAt = row.CreatedAt,
            CreatedBy = row.CreatedBy,
            UpdatedAt = row.UpdatedAt,
            UpdatedBy = row.UpdatedBy
        }
    };

    public static LegacyOrderRow ToRow(Order order) => new()
    {
        Id = order.Id,
        OrderNumber = order.OrderNumber,
        OrderDate = order.OrderDate,
        Status = order.Status.ToString(),
        Channel = order.Channel,
        Currency = order.Currency,
        SubTotal = order.SubTotal,
        Tax = order.Tax,
        ShippingCost = order.ShippingCost,
        Notes = order.Notes,
        IsGift = order.IsGift,
        NewsletterOptIn = order.NewsletterOptIn,
        CustomerRef = order.Customer.ExternalRef,
        CustomerFirstName = order.Customer.FirstName,
        CustomerLastName = order.Customer.LastName,
        CustomerEmail = order.Customer.Email,
        CustomerPhone = order.Customer.Phone,
        CustomerCompany = order.Customer.Company,
        CustomerVatNumber = order.Customer.VatNumber,
        CustomerSegment = order.Customer.Segment,
        BillingStreet = order.BillingAddress.Street,
        BillingStreet2 = order.BillingAddress.Street2,
        BillingCity = order.BillingAddress.City,
        BillingZip = order.BillingAddress.Zip,
        BillingState = order.BillingAddress.State,
        BillingCountry = order.BillingAddress.Country,
        ShippingStreet = order.ShippingAddress.Street,
        ShippingStreet2 = order.ShippingAddress.Street2,
        ShippingCity = order.ShippingAddress.City,
        ShippingZip = order.ShippingAddress.Zip,
        ShippingState = order.ShippingAddress.State,
        ShippingCountry = order.ShippingAddress.Country,
        Carrier = order.Fulfillment.Carrier,
        TrackingNumber = order.Fulfillment.TrackingNumber,
        ShippedDate = order.Fulfillment.ShippedDate,
        DeliveredDate = order.Fulfillment.DeliveredDate,
        RequiresSignature = order.Fulfillment.RequiresSignature,
        CreatedAt = order.Audit.CreatedAt,
        CreatedBy = order.Audit.CreatedBy,
        UpdatedAt = order.Audit.UpdatedAt,
        UpdatedBy = order.Audit.UpdatedBy
    };

    public static void CopyInto(Order order, LegacyOrderRow row)
    {
        var fresh = ToRow(order);
        row.OrderNumber = fresh.OrderNumber;
        row.OrderDate = fresh.OrderDate;
        row.Status = fresh.Status;
        row.Channel = fresh.Channel;
        row.Currency = fresh.Currency;
        row.SubTotal = fresh.SubTotal;
        row.Tax = fresh.Tax;
        row.ShippingCost = fresh.ShippingCost;
        row.Notes = fresh.Notes;
        row.IsGift = fresh.IsGift;
        row.NewsletterOptIn = fresh.NewsletterOptIn;
        row.CustomerRef = fresh.CustomerRef;
        row.CustomerFirstName = fresh.CustomerFirstName;
        row.CustomerLastName = fresh.CustomerLastName;
        row.CustomerEmail = fresh.CustomerEmail;
        row.CustomerPhone = fresh.CustomerPhone;
        row.CustomerCompany = fresh.CustomerCompany;
        row.CustomerVatNumber = fresh.CustomerVatNumber;
        row.CustomerSegment = fresh.CustomerSegment;
        row.BillingStreet = fresh.BillingStreet;
        row.BillingStreet2 = fresh.BillingStreet2;
        row.BillingCity = fresh.BillingCity;
        row.BillingZip = fresh.BillingZip;
        row.BillingState = fresh.BillingState;
        row.BillingCountry = fresh.BillingCountry;
        row.ShippingStreet = fresh.ShippingStreet;
        row.ShippingStreet2 = fresh.ShippingStreet2;
        row.ShippingCity = fresh.ShippingCity;
        row.ShippingZip = fresh.ShippingZip;
        row.ShippingState = fresh.ShippingState;
        row.ShippingCountry = fresh.ShippingCountry;
        row.Carrier = fresh.Carrier;
        row.TrackingNumber = fresh.TrackingNumber;
        row.ShippedDate = fresh.ShippedDate;
        row.DeliveredDate = fresh.DeliveredDate;
        row.RequiresSignature = fresh.RequiresSignature;
        row.UpdatedAt = fresh.UpdatedAt;
        row.UpdatedBy = fresh.UpdatedBy;
    }
}
