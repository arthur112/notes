/**
 * RFC 9457 problem+json as a .NET 10 API sends it (`Results.Problem` fills `title`
 * from the status). `errors` is there only on a validation problem
 * (`HttpValidationProblemDetails`: built-in validation or `Results.ValidationProblem`).
 */
export type ProblemDetails = {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  errors?: Record<string, string[]>;
};

/** An API call's outcome: expected failures (4xx problem+json) are values, not exceptions. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; problem: ProblemDetails };

/** First message per field, keyed by the server's path (`lines[0].quantity`), which is TanStack Form's field path. */
export function fieldErrors(errors: Record<string, string[]>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [field, messages[0]]),
  );
}
