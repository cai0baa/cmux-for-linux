import { memo } from "react";

interface TabItemProps {
  uiVariant?: "default" | "cmux";
  name: string;
  color?: string;
  paneCount: number;
  cwd?: string;
  gitBranch?: string;
  notificationCount?: number;
  lastLogLine?: string;
  active: boolean;
  onClick: () => void;
  onClose: () => void;
}

export default memo(function TabItem({ uiVariant = "default", name, color, paneCount, cwd, gitBranch, notificationCount, lastLogLine, active, onClick, onClose }: TabItemProps) {
  return (
    <div
      onClick={onClick}
      className={uiVariant === "cmux" ? "cmux-workspace-item" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        cursor: "pointer",
        background: active
          ? (uiVariant === "cmux" ? "rgba(255,255,255,0.07)" : "var(--cmux-accent)")
          : "transparent",
        color: active
          ? (uiVariant === "cmux" ? "#f3f3f3" : "#ffffff")
          : "var(--cmux-text-secondary)",
        fontSize: "13px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        userSelect: "none",
        transition: "background 0.1s, color 0.1s",
        borderRadius: uiVariant === "cmux" ? "8px" : "6px",
        margin: "0 8px",
        marginTop: "4px"
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
          e.currentTarget.style.color = "var(--cmux-text)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--cmux-text-secondary)";
        }
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, overflow: "hidden", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {color && (
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: color,
              flexShrink: 0,
              opacity: active ? 1 : 0.7,
            }} />
          )}
          {notificationCount ? (
            <span style={{
              background: "#007aff",
              color: "white",
              fontSize: "9px",
              fontWeight: "bold",
              borderRadius: "50%",
              width: "14px",
              height: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              {notificationCount}
            </span>
          ) : null}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: active ? 600 : 500,
            }}
          >
            {name}
          </span>
          {paneCount > 1 && (
            <span className="cmux-pill" style={{
              flexShrink: 0,
              background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
              color: active ? "#ffffff" : "var(--cmux-text-secondary)"
            }}>
              {paneCount}
            </span>
          )}
        </div>
        {lastLogLine && (
          <span style={{
            fontSize: "12px",
            color: active ? "rgba(255,255,255,0.85)" : "var(--cmux-text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.2
          }}>
            {lastLogLine}
          </span>
        )}
        <span style={{
          fontSize: "11px",
          color: active ? "rgba(255,255,255,0.6)" : "var(--cmux-text-tertiary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: 1.2
        }}>
          {cwd ? cwd.replace(/^\/home\/[^\/]+/, '~') : 'Starting session...'}
          {gitBranch ? ` —  ${gitBranch}` : ''}
        </span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          background: "none",
          border: "none",
          color: active ? "rgba(255,255,255,0.6)" : "var(--cmux-text-tertiary)",
          cursor: "pointer",
          fontSize: "12px",
          padding: "2px 4px",
          lineHeight: 1,
          flexShrink: 0,
          opacity: 0,
          transition: "opacity 0.1s, color 0.1s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = active ? "#ffffff" : "var(--cmux-text)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = active ? "rgba(255,255,255,0.6)" : "var(--cmux-text-tertiary)";
        }}
        title="Close workspace"
        className="tab-close-btn"
      >
        ×
      </button>
    </div>
  );
});
