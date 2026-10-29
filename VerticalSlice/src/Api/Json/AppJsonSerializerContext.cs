using System.Text.Json.Serialization;
using Api.Features.Fund;
using Api.Features.SampleRecord;

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
[JsonSerializable(
    typeof(CreateSampleRecord.Request),
    TypeInfoPropertyName = "CreateSampleRecordRequest"
)]
[JsonSerializable(
    typeof(UpdateSampleRecord.Request),
    TypeInfoPropertyName = "UpdateSampleRecordRequest"
)]
[JsonSerializable(
    typeof(ImportSampleRecords.Request),
    TypeInfoPropertyName = "ImportSampleRecordsRequest"
)]
[JsonSerializable(
    typeof(ImportSampleRecords.Response),
    TypeInfoPropertyName = "ImportSampleRecordsResponse"
)]
[JsonSerializable(typeof(SampleRecordResponse))]
[JsonSerializable(
    typeof(Api.Querying.PagedResult<SampleRecordResponse>),
    TypeInfoPropertyName = "SampleRecordPagedResponse"
)]
[JsonSerializable(typeof(Microsoft.AspNetCore.Mvc.ProblemDetails))]
[JsonSerializable(typeof(Microsoft.AspNetCore.Http.HttpValidationProblemDetails))]
public sealed partial class AppJsonSerializerContext : JsonSerializerContext;
