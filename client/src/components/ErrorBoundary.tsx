import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort catch for render/lifecycle exceptions. Without one, any throw in
 * the tree unmounts the whole app and leaves a blank page with the error only
 * in the console. It does not catch errors in event handlers or timers (those
 * don't unwind React's render), so the editor's own state is still the first
 * line of defence.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled editor error', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="fatal-error">
        <h1>Something went wrong</h1>
        <p className="fatal-error-message">{error.message}</p>
        <p className="panel-hint">
          Your project file is untouched — reload the page, then load it again if the editor comes
          back empty.
        </p>
        <div className="button-row">
          <button className="button" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <button className="button ghost" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
