using System.Text.Json.Serialization;
using Api.Features.Customers;
using Api.Features.Orders;
using Api.Querying;

namespace Api.Json;

[JsonSerializable(typeof(ListCustomers.CustomerRow))]
[JsonSerializable(typeof(IReadOnlyList<ListCustomers.CustomerRow>))]
[JsonSerializable(typeof(PagedResult<ListCustomers.CustomerRow>))]
[JsonSerializable(typeof(ListCustomerOptions.CustomerOption))]
[JsonSerializable(typeof(List<ListCustomerOptions.CustomerOption>))]
[JsonSerializable(typeof(ListOrders.OrderRow))]
[JsonSerializable(typeof(IReadOnlyList<ListOrders.OrderRow>))]
[JsonSerializable(typeof(PagedResult<ListOrders.OrderRow>))]
[JsonSerializable(typeof(OrderInput))]
[JsonSerializable(typeof(OrderDetail))]
[JsonSerializable(typeof(GetOrderOverview.OrderOverview))]
[JsonSerializable(typeof(bool))]
[JsonSerializable(typeof(Microsoft.AspNetCore.Mvc.ProblemDetails))]
[JsonSerializable(typeof(Microsoft.AspNetCore.Http.HttpValidationProblemDetails))]
public sealed partial class AppJsonSerializerContext : JsonSerializerContext;
