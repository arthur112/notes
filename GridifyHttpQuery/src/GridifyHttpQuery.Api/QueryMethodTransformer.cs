using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.OpenApi;

namespace GridifyHttpQuery.Api;

/// <summary>
/// ASP.NET Core 10 emits OpenAPI 3.1, which has no QUERY method, so it skips QUERY endpoints.
/// ApiExplorer still describes them; this rebuilds each one as OpenAPI 3.2's <c>query</c>
/// operation, which Scalar renders.
/// </summary>
internal sealed class QueryMethodTransformer : IOpenApiDocumentTransformer
{
    public async Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
    {
        var descriptions = context.DescriptionGroups
            .SelectMany(group => group.Items)
            .Where(description => description.HttpMethod == HttpMethods.Query);

        foreach (var description in descriptions)
        {
            var metadata = description.ActionDescriptor.EndpointMetadata;
            var operation = new OpenApiOperation
            {
                OperationId = metadata.OfType<IEndpointNameMetadata>().LastOrDefault()?.EndpointName,
                Summary = metadata.OfType<IEndpointSummaryMetadata>().LastOrDefault()?.Summary,
                Tags = metadata.OfType<ITagsMetadata>()
                    .SelectMany(tags => tags.Tags)
                    .Select(tag => new OpenApiTagReference(tag, document))
                    .ToHashSet(),
                Responses = [],
            };

            if (description.ParameterDescriptions.SingleOrDefault(p => p.Source == BindingSource.Body) is { } body)
            {
                operation.RequestBody = new OpenApiRequestBody
                {
                    Required = true,
                    Content = new Dictionary<string, OpenApiMediaType>
                    {
                        ["application/json"] = new() { Schema = await context.GetOrCreateSchemaAsync(body.Type, body, cancellationToken) },
                    },
                };
            }

            foreach (var response in description.SupportedResponseTypes)
            {
                var schema = response.Type is { } type && type != typeof(void)
                    ? await context.GetOrCreateSchemaAsync(type, cancellationToken: cancellationToken)
                    : null;
                operation.Responses[response.StatusCode.ToString()] = new OpenApiResponse
                {
                    Description = ReasonPhrases.GetReasonPhrase(response.StatusCode),
                    Content = schema is null
                        ? null
                        : response.ApiResponseFormats.ToDictionary(format => format.MediaType, _ => new OpenApiMediaType { Schema = schema }),
                };
            }

            var path = "/" + description.RelativePath?.TrimEnd('/');
            if (!document.Paths.TryGetValue(path, out var pathItem))
                document.Paths[path] = pathItem = new OpenApiPathItem();

            var operations = ((OpenApiPathItem)pathItem).Operations ??= [];
            operations[HttpMethod.Query] = operation;
        }
    }
}
