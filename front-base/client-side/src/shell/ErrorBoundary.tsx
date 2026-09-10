import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Keeps a failing (or failing-to-load) app from taking down the shell. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-box">
          <h2>This application failed to load</h2>
          <p>{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
