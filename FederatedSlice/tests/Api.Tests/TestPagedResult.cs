namespace Api.Tests;

public record TestPagedResult<T>(List<T> Data, int Count);
