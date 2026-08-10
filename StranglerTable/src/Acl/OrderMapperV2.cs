using StranglerTable.Domain;

namespace StranglerTable.Acl;

public static class OrderMapperV2
{
    public static Order ToDomain(OrderRowV2 row) => new()
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
        BillingAddress = row.BillingAddress is null ? new Address() : new Address
        {
            Street = row.BillingAddress.Street,
            Street2 = row.BillingAddress.Street2,
            City = row.BillingAddress.City,
            Zip = row.BillingAddress.Zip,
            State = row.BillingAddress.State,
            Country = row.BillingAddress.Country
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

    public static OrderRowV2 ToRow(Order order) => new()
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
        UpdatedBy = order.Audit.UpdatedBy,
        BillingAddress = new BillingAddressRow
        {
            OrderId = order.Id,
            Street = order.BillingAddress.Street,
            Street2 = order.BillingAddress.Street2,
            City = order.BillingAddress.City,
            Zip = order.BillingAddress.Zip,
            State = order.BillingAddress.State,
            Country = order.BillingAddress.Country
        }
    };
}
