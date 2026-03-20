import { memo } from "react";
import { useWorkspaceListStore } from "../../stores/workspaceStore";
import TerminalGrid from "./TerminalGrid";

export default memo(function WorkspaceView() {
  const workspaces = useWorkspaceListStore((s) => s.workspaces);
  const activeId = useWorkspaceListStore((s) => s.activeWorkspaceId);

  if (workspaces.length === 0) {
    return (
      <div style={{ color: "var(--cmux-textMuted, #6c7086)", padding: 20, fontSize: 13, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace" }}>
         <div style={{ textAlign: "center" }}>
           <h3 style={{ fontWeight: 500, color: "var(--cmux-text, #cdd6f4)" }}>No Active Workspaces</h3>
           <p style={{ marginTop: 8 }}>Press <kbd style={{ padding: "2px 6px", background: "var(--cmux-surface, #1e1e2e)", borderRadius: 4, border: "1px solid var(--cmux-border, #313244)" }}>Ctrl+Shift+N</kbd> or use the Command Palette to create one.</p>
         </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {workspaces.map((workspace) => (
        <div
          key={workspace.id}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            visibility: workspace.id === activeId ? "visible" : "hidden",
            zIndex: workspace.id === activeId ? 1 : 0,
            pointerEvents: workspace.id === activeId ? "auto" : "none",
          }}
        >
          <TerminalGrid
            workspaceId={workspace.id}
            gridTemplateId={workspace.gridTemplateId}
            panes={workspace.panes}
            splitRows={workspace.splitRows}
          />
        </div>
      ))}
    </div>
  );
});
