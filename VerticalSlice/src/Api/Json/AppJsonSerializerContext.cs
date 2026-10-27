using System.Text.Json.Serialization;
using Api.Features.Fund;

namespace Api.Json;

[JsonSerializable(typeof(CreateFund.Request), TypeInfoPropertyName = "CreateFundRequest")]
[JsonSerializable(typeof(CreateFund.Response), TypeInfoPropertyName = "CreateFundResponse")]
[JsonSerializable(typeof(UpdateFund.Request), TypeInfoPropertyName = "UpdateFundRequest")]
[JsonSerializable(typeof(UpdateFund.Response), TypeInfoPropertyName = "UpdateFundResponse")]
[JsonSerializable(typeof(GetFund.Response), TypeInfoPropertyName = "GetFundResponse")]
[JsonSerializable(typeof(ListFunds.Response), TypeInfoPropertyName = "ListFundsResponse")]
[JsonSerializable(
    typeof(IReadOnlyList<ListFunds.Response>),
    TypeInfoPropertyName = "ListFundsResponseList"
)]
[JsonSerializable(
    typeof(Api.Querying.PagedResult<ListFunds.Response>),
    TypeInfoPropertyName = "ListFundsPagedResponse"
)]
[JsonSerializable(typeof(Microsoft.AspNetCore.Mvc.ProblemDetails))]
[JsonSerializable(typeof(Microsoft.AspNetCore.Http.HttpValidationProblemDetails))]
public sealed partial class AppJsonSerializerContext : JsonSerializerContext;
