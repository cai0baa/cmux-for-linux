import { useEffect, useRef, useMemo } from "react";
import { useWorkspaceListStore, usePaneMetadataStore } from "../../stores/workspaceStore";

interface NotificationPanelProps {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const workspaces = useWorkspaceListStore((s) => s.workspaces);
  const setActive = useWorkspaceListStore((s) => s.setActiveWorkspace);
  const paneMetadata = usePaneMetadataStore((s) => s.metadata);
  const clearNotification = usePaneMetadataStore((s) => s.clearNotification);
  const panelRef = useRef<HTMLDivElement>(null);

  // Collect all panes with notifications (memoized to avoid O(n*m) rebuild)
  const notifications = useMemo(() => {
    const result: { workspaceId: string; workspaceName: string; workspaceColor: string; sessionId: string; count: number; lastLogLine?: string }[] = [];
    for (const ws of workspaces) {
      for (const pane of ws.panes) {
        const m = paneMetadata[pane.sessionId];
        if (m && (m.notificationCount ?? 0) > 0) {
          result.push({
            workspaceId: ws.id,
            workspaceName: ws.name,
            workspaceColor: ws.color ?? "#0A84FF",
            sessionId: pane.sessionId,
            count: m.notificationCount ?? 0,
            lastLogLine: m.lastLogLine,
          });
        }
      }
    }
    return result;
  }, [workspaces, paneMetadata]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  function handleClearAll() {
    for (const n of notifications) {
      clearNotification(n.sessionId);
    }
    onClose();
  }

  return (
    <div
      ref={panelRef}
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: 4,
        width: 260,
        maxWidth: "min(260px, calc(100vw - 16px))",
        background: "var(--cmux-sidebar)",
        border: "1px solid var(--cmux-border)",
        borderRadius: 6,
        zIndex: 100,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        fontSize: 12,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "var(--cmux-text)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--cmux-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 600, fontSize: 11 }}>Notifications</span>
        {notifications.length > 0 && (
          <button
            onClick={handleClearAll}
            style={{ background: "none", border: "none", color: "var(--cmux-text-tertiary)", cursor: "pointer", fontSize: 11, padding: 0 }}
          >
            Clear all
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div style={{ padding: "12px", color: "var(--cmux-text-tertiary)", textAlign: "center", fontSize: 11 }}>
          No notifications
        </div>
      ) : (
        <div>
          {notifications.map((n) => (
            <div
              key={n.sessionId}
              onClick={() => {
                setActive(n.workspaceId);
                clearNotification(n.sessionId);
                onClose();
              }}
              style={{
                cursor: "pointer",
                borderBottom: "1px solid var(--cmux-border)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
                {/* Workspace color dot */}
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: n.workspaceColor,
                  flexShrink: 0,
                }} />
                {/* Workspace name */}
                <span style={{ flex: 1, fontWeight: 500, fontSize: 12 }}>{n.workspaceName}</span>
                {/* Count badge */}
                <span style={{
                  background: "#007aff",
                  color: "white",
                  fontSize: 9,
                  fontWeight: "bold",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {n.count}
                </span>
              </div>
              {n.lastLogLine && (
                <div style={{
                  padding: "0 12px 8px 28px",
                  fontSize: 11,
                  color: "var(--cmux-text-secondary)",
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {n.lastLogLine}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
