import { memo, useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface BrowserPaneProps {
  sessionId: string;
}

export default memo(function BrowserPane({ sessionId }: BrowserPaneProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("about:blank");
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const createdRef = useRef(false);

  const normalize = (target: string): string => {
    const t = target.trim();
    if (!t) return "about:blank";
    if (t.startsWith("http://") || t.startsWith("https://") || t.startsWith("about:")) return t;
    return "https://" + t;
  };

  const navigate = useCallback((url: string) => {
    const normalized = normalize(url);
    setCurrentUrl(normalized);
    setInputUrl(normalized === "about:blank" ? "" : normalized);
    setIsLoading(true);
    invoke("browser_navigate", { sessionId, url: normalized })
      .catch((e) => console.error("browser_navigate error:", e))
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  // Create webview on mount, destroy on unmount
  useEffect(() => {
    if (!containerRef.current) return;
    if (createdRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    createdRef.current = true;

    invoke("browser_create", {
      sessionId,
      x: rect.left,
      y: rect.top,
      w: rect.width,
      h: rect.height,
    }).catch((e) => console.error("browser_create error:", e));

    return () => {
      invoke("browser_destroy", { sessionId }).catch(() => {});
      createdRef.current = false;
    };
  }, [sessionId]);

  // ResizeObserver to keep webview bounds in sync with layout
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      invoke("browser_set_bounds", {
        sessionId,
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
      }).catch(() => {});
    });

    observer.observe(el);
    // Also watch document body for window moves/resizes
    observer.observe(document.body);

    return () => observer.disconnect();
  }, [sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") navigate(inputUrl);
  };

  const handleBack = () => {
    invoke("browser_eval", { sessionId, script: "history.back(); null" }).catch(() => {});
  };
  const handleForward = () => {
    invoke("browser_eval", { sessionId, script: "history.forward(); null" }).catch(() => {});
  };
  const handleRefresh = () => {
    invoke("browser_eval", { sessionId, script: "location.reload(); null" }).catch(() => {});
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
        {isLoading && (
          <span style={{ color: "var(--cmux-text-tertiary)", fontSize: 11 }}>…</span>
        )}
      </div>
      {/* Webview placeholder — wry renders natively here */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: "relative" }}
      >
        {currentUrl === "about:blank" && (
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
              pointerEvents: "none",
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
