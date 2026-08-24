export interface ErrorSummaryEntry {
  field: string
  label: string
  message: string
}

export interface ErrorSummaryProps {
  errors: ErrorSummaryEntry[]
  onSelect?: (field: string) => void
}

export function ErrorSummary({ errors, onSelect }: ErrorSummaryProps) {
  if (errors.length === 0) return null
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm"
    >
      <p className="font-medium text-destructive">
        {errors.length === 1
          ? 'There is 1 problem with this form.'
          : `There are ${errors.length} problems with this form.`}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errors.map((error) => (
          <li key={error.field}>
            <button
              type="button"
              className="text-left underline-offset-2 hover:underline"
              onClick={() => onSelect?.(error.field)}
            >
              <span className="font-medium">{error.label}:</span> {error.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
