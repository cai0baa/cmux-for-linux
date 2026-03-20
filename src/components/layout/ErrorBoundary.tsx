import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: 20, color: "var(--cmux-text, #fff)", fontFamily: "'JetBrains Mono', monospace", background: "var(--cmux-bg, #000)", width: "100%", height: "100%" }}>
          <h2>Something went wrong.</h2>
          <pre style={{ color: "var(--cmux-red, #ff5555)", fontSize: 12 }}>{this.state.error?.toString()}</pre>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{ marginTop: 10, padding: "6px 12px", background: "var(--cmux-surface, #222)", color: "inherit", border: "1px solid var(--cmux-border, #444)", borderRadius: 4, cursor: "pointer" }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
