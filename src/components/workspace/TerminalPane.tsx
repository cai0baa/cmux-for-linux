import { memo, useCallback, useState } from "react";
import type { Pane, PaneTab } from "../../types";
import PaneTabBar from "./PaneTabBar";
import XTermWrapper from "../terminal/XTermWrapper";
import BrowserPane from "../browser/BrowserPane";
import { 
  useWorkspaceLayoutStore, 
  useUiStore, 
  usePaneMetadataStore 
} from "../../stores/workspaceStore";
import { getAgent, getDefaultAgent } from "../../lib/agents";

interface TerminalPaneProps {
  pane: Pane;
  workspaceId: string;
  onClose?: () => void;
  onSplitRight?: () => void;
  onSplitDown?: () => void;
}

// Per-tab exit/restart state lives here
function useTabState() {
  const [tabStates, setTabStates] = useState<Record<string, { exited: boolean; restartKey: number }>>({});

  const getTabState = (tabId: string) => tabStates[tabId] ?? { exited: false, restartKey: 0 };

  const setExited = useCallback((tabId: string) => {
    setTabStates((s) => ({ ...s, [tabId]: { ...s[tabId], exited: true, restartKey: s[tabId]?.restartKey ?? 0 } }));
  }, []);

  const restartTab = useCallback((tabId: string) => {
    setTabStates((s) => ({
      ...s,
      [tabId]: { exited: false, restartKey: (s[tabId]?.restartKey ?? 0) + 1 },
    }));
  }, []);

  return { getTabState, setExited, restartTab };
}

export default memo(function TerminalPane({ pane, workspaceId, onClose, onSplitRight, onSplitDown }: TerminalPaneProps) {
  const paneMeta = usePaneMetadataStore((s) => s.metadata[pane.sessionId]);
  const notificationCount = paneMeta?.notificationCount ?? 0;
  const paneCwd = paneMeta?.cwd ?? pane.cwd;
  const flashingPaneIds = usePaneMetadataStore((s) => s.flashingPaneIds);
  const activePaneId = useUiStore((s) => s.activePaneId);
  const setActivePaneId = useUiStore((s) => s.setActivePaneId);
  const zoomedPaneId = useUiStore((s) => s.zoomedPaneId);
  const setZoomedPaneId = useUiStore((s) => s.setZoomedPaneId);
  const clearNotification = usePaneMetadataStore((s) => s.clearNotification);
  const addTabToPane = useWorkspaceLayoutStore((s) => s.addTabToPane);
  const removeTabFromPane = useWorkspaceLayoutStore((s) => s.removeTabFromPane);
  const setActivePaneTab = useWorkspaceLayoutStore((s) => s.setActivePaneTab);

  const isActive = activePaneId === pane.sessionId;
  const isFlashing = flashingPaneIds.has(pane.sessionId);
  const isZoomed = zoomedPaneId === pane.id;

  const { getTabState, setExited, restartTab } = useTabState();

  const handleFocus = useCallback(() => {
    setActivePaneId(pane.sessionId);
    clearNotification(pane.sessionId);
  }, [pane.sessionId, setActivePaneId, clearNotification]);

  const handleBlur = useCallback(() => {
    setActivePaneId(null);
  }, [setActivePaneId]);

  const handleAddTab = useCallback((agentId?: string, type?: PaneTab["type"]) => {
    addTabToPane(workspaceId, pane.id, agentId, type);
  }, [workspaceId, pane.id, addTabToPane]);

  const handleRemoveTab = useCallback((tabId: string) => {
    removeTabFromPane(workspaceId, pane.id, tabId);
  }, [workspaceId, pane.id, removeTabFromPane]);

  const handleSelectTab = useCallback((tabId: string) => {
    setActivePaneTab(workspaceId, pane.id, tabId);
  }, [workspaceId, pane.id, setActivePaneTab]);

  const handleZoomToggle = useCallback(() => {
    const currentZoomed = useUiStore.getState().zoomedPaneId;
    setZoomedPaneId(currentZoomed === pane.id ? null : pane.id);
  }, [pane.id, setZoomedPaneId]);

  return (
    <div
      data-session-id={pane.sessionId}
      tabIndex={-1}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={{
        ...(isZoomed ? {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
          background: "var(--cmux-bg, #0a0a0a)",
        } : {
          position: "relative",
          width: "100%",
          height: "100%",
        }),
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        outline: isActive && !isZoomed ? "1px solid rgba(10, 132, 255, 0.5)" : "1px solid transparent",
        transition: "outline 0.15s",
      }}
    >
      {/* Flash overlay */}
      {isFlashing && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 20,
            borderRadius: 2,
            animation: "paneFlash 0.9s ease-out",
            border: "3px solid var(--cmux-accent)",
          }}
        />
      )}

      <PaneTabBar
        pane={pane}
        workspaceId={workspaceId}
        hasNotification={notificationCount > 0}
        onClose={onClose}
        onSplitRight={onSplitRight}
        onSplitDown={onSplitDown}
        onAddTab={handleAddTab}
        onRemoveTab={handleRemoveTab}
        onSelectTab={handleSelectTab}
      />

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        {/* Render all tabs — hide inactive ones to preserve PTY state */}
        {pane.tabs.map((tab) => {
          const isActiveTab = tab.id === pane.activeTabId;
          const { exited, restartKey } = getTabState(tab.id);
          const agent = getAgent(tab.agentId) ?? getDefaultAgent();

          return (
            <div
              key={tab.id}
              style={{
                position: "absolute",
                inset: 0,
                display: isActiveTab ? "flex" : "none",
                flexDirection: "column",
              }}
            >
              {tab.type === "browser" ? (
                <BrowserPane sessionId={tab.sessionId} />
              ) : (
                <>
                  <XTermWrapper
                    key={`${tab.sessionId}-${restartKey}`}
                    sessionId={tab.sessionId}
                    command={agent.command}
                    args={agent.args}
                    onExit={() => setExited(tab.id)}
                    suppressNotifications={isActive && tab.id === pane.activeTabId}
                    onZoomToggle={handleZoomToggle}
                    cwd={paneCwd}
                  />
                  {exited && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 12,
                        left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        gap: 8,
                      }}
                    >
                      <button
                        onClick={() => restartTab(tab.id)}
                        style={{
                          background: "rgba(30,30,30,0.92)",
                          border: "1px solid var(--cmux-border)",
                          borderRadius: 4,
                          color: "var(--cmux-text)",
                          cursor: "pointer",
                          fontSize: 12,
                          fontFamily: "'JetBrains Mono', monospace",
                          padding: "4px 12px",
                        }}
                      >
                        ↺ Restart
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom memo comparator: only re-render if pane content actually changed
  return (
    prevProps.pane.id === nextProps.pane.id &&
    prevProps.pane.activeTabId === nextProps.pane.activeTabId &&
    prevProps.pane.tabs.length === nextProps.pane.tabs.length &&
    prevProps.workspaceId === nextProps.workspaceId &&
    prevProps.onClose === nextProps.onClose &&
    prevProps.onSplitRight === nextProps.onSplitRight &&
    prevProps.onSplitDown === nextProps.onSplitDown
  );
});
