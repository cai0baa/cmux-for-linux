import { memo } from "react";
import { PANE_HEADER_HEIGHT } from "../../lib/constants";

interface PaneHeaderProps {
  onClose?: () => void;
  hasNotification?: boolean;
}

const SplitIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>
);

export default memo(function PaneHeader({ onClose, hasNotification }: PaneHeaderProps) {
  return (
    <div
      style={{
        height: PANE_HEADER_HEIGHT,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        background: "transparent",
        fontSize: "12px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "var(--cmux-text-secondary)",
        flexShrink: 0,
        gap: 8,
        userSelect: "none",
        borderTop: hasNotification ? "1px solid rgba(255, 59, 48, 0.5)" : "1px solid transparent",
        transition: "border 0.2s",
      }}
    >
      <span style={{ color: hasNotification ? "#ff3b30" : "var(--cmux-text-tertiary)", fontSize: "10px" }}>•</span>
      <span style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button className="pane-action-btn" title="Split pane">
          <SplitIcon />
        </button>
        {onClose && (
          <button className="pane-action-btn" onClick={onClose} title="Close pane">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        )}
      </div>
    </div>
  );
});
