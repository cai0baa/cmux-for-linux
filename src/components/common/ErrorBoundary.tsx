import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset);
      }
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            height: "100%",
            background: "var(--cmux-bg, #0a0a0a)",
            color: "var(--cmux-text-secondary, rgba(255,255,255,0.6))",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            padding: 24,
          }}
        >
          <span style={{ fontSize: 20, color: "#f38ba8" }}>⚠</span>
          <span style={{ color: "var(--cmux-text, #ededed)" }}>Pane crashed</span>
          <span
            style={{
              fontSize: 11,
              color: "var(--cmux-text-tertiary, rgba(255,255,255,0.3))",
              textAlign: "center",
              maxWidth: 300,
              wordBreak: "break-word",
            }}
          >
            {error.message}
          </span>
          <button
            onClick={this.reset}
            style={{
              marginTop: 8,
              padding: "5px 14px",
              fontSize: 12,
              background: "var(--cmux-surface, #161616)",
              border: "1px solid var(--cmux-border, rgba(255,255,255,0.1))",
              borderRadius: 5,
              color: "var(--cmux-text, #ededed)",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
