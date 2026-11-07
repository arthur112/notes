import type { ErrorComponentProps } from "@tanstack/react-router";

/** Shown while an app's chunk (or an awaited loader) is on its way. */
export function AppPending() {
  return <div className="loading">Loading application…</div>;
}

/**
 * The router's error boundary for every route: a broken (or failing-to-load)
 * app is replaced by this box, inside the shell, which keeps working.
 */
export function AppError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="m-6 error-box" role="alert">
      <h2>This application failed to load</h2>
      <p>{error instanceof Error ? error.message : String(error)}</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
