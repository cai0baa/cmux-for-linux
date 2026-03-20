import { useWorkspaceListStore, usePaneMetadataStore } from "../../stores/workspaceStore";
import { SIDEBAR_WIDTH } from "../../lib/constants";
import TabItem from "./TabItem";

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

interface TabBarProps {
  uiVariant?: "default" | "cmux";
  onNewWorkspace: () => void;
  onCloseWorkspace: (id: string) => void;
}

export default function TabBar({ uiVariant = "default", onNewWorkspace, onCloseWorkspace }: TabBarProps) {
  const workspaces = useWorkspaceListStore((s) => s.workspaces);
  const activeId = useWorkspaceListStore((s) => s.activeWorkspaceId);
  const setActive = useWorkspaceListStore((s) => s.setActiveWorkspace);
  const paneMetadata = usePaneMetadataStore((s) => s.metadata);

  return (
    <div
      data-tauri-drag-region
      style={{
        width: SIDEBAR_WIDTH,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: uiVariant === "cmux" ? "#151515" : "var(--cmux-sidebar)",
        borderRight: "1px solid var(--cmux-border)",
        flexShrink: 0,
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      <div style={{ flex: 1 }}>
        {workspaces.map((ws) => {
          let totalWsNotifications = 0;
          let lastLog: string | undefined;
          for (const pane of ws.panes) {
            const m = paneMetadata[pane.sessionId];
            if (m) {
              totalWsNotifications += m.notificationCount ?? 0;
              if (m.lastLogLine) lastLog = m.lastLogLine;
            }
          }
          const firstSessionId = ws.panes[0]?.sessionId;
          const firstPaneMeta = firstSessionId ? paneMetadata[firstSessionId] : undefined;
          return (
            <TabItem
              key={ws.id}
              uiVariant={uiVariant}
              name={ws.name}
              color={ws.color}
              paneCount={ws.panes.length}
              cwd={firstPaneMeta?.cwd}
              gitBranch={firstPaneMeta?.gitBranch}
              notificationCount={totalWsNotifications || undefined}
              lastLogLine={lastLog}
              active={ws.id === activeId}
              onClick={() => setActive(ws.id)}
              onClose={() => onCloseWorkspace(ws.id)}
            />
          );
        })}
      </div>

      {/* New workspace button at bottom */}
      <button
        onClick={onNewWorkspace}
        title="New workspace (Ctrl+Shift+N)"
        className={uiVariant === "cmux" ? "cmux-title-btn" : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          background: "none",
          border: "none",
          borderTop: "1px solid var(--cmux-border)",
          color: "var(--cmux-text-tertiary)",
          cursor: "pointer",
          padding: "10px 16px",
          fontSize: 12,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          textAlign: "left",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = uiVariant === "cmux" ? "var(--cmux-hover)" : "rgba(255,255,255,0.04)";
          e.currentTarget.style.color = "var(--cmux-text-secondary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "none";
          e.currentTarget.style.color = "var(--cmux-text-tertiary)";
        }}
      >
        <PlusIcon />
        <span>New workspace</span>
      </button>
    </div>
  );
}
