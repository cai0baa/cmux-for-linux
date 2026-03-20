import { memo, useState, useRef } from "react";

interface BrowserPaneProps {
  sessionId: string;
}

export default memo(function BrowserPane({ sessionId: _sessionId }: BrowserPaneProps) {
  const [url, setUrl] = useState("about:blank");
  const [inputUrl, setInputUrl] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const navigate = (target: string) => {
    let normalized = target.trim();
    if (normalized && !normalized.startsWith("http://") && !normalized.startsWith("https://") && !normalized.startsWith("about:")) {
      normalized = "https://" + normalized;
    }
    setUrl(normalized || "about:blank");
    setInputUrl(normalized || "");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      navigate(inputUrl);
    }
  };

  const handleBack = () => {
    try { iframeRef.current?.contentWindow?.history.back(); } catch { /* cross-origin */ }
  };

  const handleForward = () => {
    try { iframeRef.current?.contentWindow?.history.forward(); } catch { /* cross-origin */ }
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      // Re-set src to force reload
      const current = url;
      setUrl("about:blank");
      setTimeout(() => setUrl(current), 0);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#111" }}>
      {/* URL bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          background: "#1a1a1a",
          borderBottom: "1px solid var(--cmux-border)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleBack}
          title="Back"
          style={{ background: "none", border: "none", color: "var(--cmux-text-tertiary)", cursor: "pointer", padding: "2px 4px", fontSize: 14 }}
        >
          ‹
        </button>
        <button
          onClick={handleForward}
          title="Forward"
          style={{ background: "none", border: "none", color: "var(--cmux-text-tertiary)", cursor: "pointer", padding: "2px 4px", fontSize: 14 }}
        >
          ›
        </button>
        <button
          onClick={handleRefresh}
          title="Refresh"
          style={{ background: "none", border: "none", color: "var(--cmux-text-tertiary)", cursor: "pointer", padding: "2px 4px", fontSize: 12 }}
        >
          ↻
        </button>
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          placeholder="Enter URL..."
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--cmux-border)",
            borderRadius: 4,
            color: "var(--cmux-text)",
            fontSize: 12,
            fontFamily: "monospace",
            padding: "3px 8px",
            outline: "none",
          }}
        />
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <iframe
          ref={iframeRef}
          src={url}
          style={{ width: "100%", height: "100%", border: "none", background: "#fff" }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Browser pane"
        />
        {url === "about:blank" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--cmux-text-tertiary)",
              gap: 8,
              fontFamily: "monospace",
              fontSize: 13,
            }}
          >
            <span style={{ fontSize: 32 }}>🌐</span>
            <span>Enter a URL above to browse</span>
          </div>
        )}
      </div>
    </div>
  );
});
