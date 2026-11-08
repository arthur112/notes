using System.Text.Json.Serialization;
using Api.Features.Customers;
using Api.Features.Orders;
using Api.Querying;

namespace Api.Json;

[JsonSerializable(typeof(ListCustomers.Response), TypeInfoPropertyName = "Customer")]
[JsonSerializable(typeof(IReadOnlyList<ListCustomers.Response>), TypeInfoPropertyName = "CustomerList")]
[JsonSerializable(typeof(PagedResult<ListCustomers.Response>), TypeInfoPropertyName = "CustomersPage")]
[JsonSerializable(typeof(ListCustomerOptions.Response), TypeInfoPropertyName = "CustomerOption")]
[JsonSerializable(typeof(List<ListCustomerOptions.Response>), TypeInfoPropertyName = "CustomerOptions")]
[JsonSerializable(typeof(ListOrders.Response), TypeInfoPropertyName = "OrderRow")]
[JsonSerializable(typeof(IReadOnlyList<ListOrders.Response>), TypeInfoPropertyName = "OrderRowList")]
[JsonSerializable(typeof(PagedResult<ListOrders.Response>), TypeInfoPropertyName = "OrdersPage")]
[JsonSerializable(typeof(OrderInput))]
[JsonSerializable(typeof(OrderDetail))]
[JsonSerializable(typeof(bool))]
[JsonSerializable(typeof(Microsoft.AspNetCore.Mvc.ProblemDetails))]
[JsonSerializable(typeof(Microsoft.AspNetCore.Http.HttpValidationProblemDetails))]
public sealed partial class AppJsonSerializerContext : JsonSerializerContext;
