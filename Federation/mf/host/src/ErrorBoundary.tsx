import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; onReset: () => void }
type State = { error: Error | null }

/**
 * Keeps a failing (or unreachable) remote from taking down the shell.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Remote crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-box">
          <h2>This application failed to load</h2>
          <p>{this.state.error.message}</p>
          <button
            onClick={() => {
              this.setState({ error: null })
              this.props.onReset()
            }}
          >
            Back to dashboard
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
