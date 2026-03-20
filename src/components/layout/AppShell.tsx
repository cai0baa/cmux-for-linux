import { useState, useCallback, useEffect, useRef } from "react";
import type { GridTemplateId } from "../../types";
import { 
  useWorkspaceListStore, 
  useWorkspaceLayoutStore, 
  useUiStore, 
  usePaneMetadataStore 
} from "../../stores/workspaceStore";
import { killSession } from "../../lib/ipc";
import { SIDEBAR_WIDTH } from "../../lib/constants";
import TabBar from "./TabBar";
import TitleBar from "./TitleBar";
import WorkspaceView from "../workspace/WorkspaceView";
import WorkspaceSetup from "../setup/WorkspaceSetup";
import CommandPalette from "./CommandPalette";
import SocketListener from "./SocketListener";
import KeybindingsModal from "./KeybindingsModal";
import { useKeybindingStore } from "../../stores/keybindingStore";

type Direction = "up" | "down" | "left" | "right";

/**
 * Find the best pane to focus when navigating in a direction.
 * Uses actual DOM positions for accurate navigation in any layout.
 */
function findPaneInDirection(
  currentSessionId: string,
  direction: Direction,
  panes: { sessionId: string }[]
): string | null {
  const currentEl = document.querySelector<HTMLElement>(`[data-session-id="${currentSessionId}"]`);
  if (!currentEl) return null;
  
  const currentRect = currentEl.getBoundingClientRect();
  const currentCenterX = currentRect.left + currentRect.width / 2;
  const currentCenterY = currentRect.top + currentRect.height / 2;
  
  let bestCandidate: string | null = null;
  let bestScore = Infinity;
  
  for (const pane of panes) {
    if (pane.sessionId === currentSessionId) continue;
    
    const el = document.querySelector<HTMLElement>(`[data-session-id="${pane.sessionId}"]`);
    if (!el) continue;
    
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Check if pane is in the correct direction
    let isInDirection = false;
    let primaryDistance = 0;
    let secondaryDistance = 0;
    
    switch (direction) {
      case "up":
        // Pane must be above (its bottom edge above our top edge, with some tolerance)
        isInDirection = rect.bottom <= currentRect.top + 5;
        primaryDistance = currentRect.top - rect.bottom; // Distance in primary direction
        secondaryDistance = Math.abs(centerX - currentCenterX); // Horizontal alignment
        break;
      case "down":
        // Pane must be below (its top edge below our bottom edge, with some tolerance)
        isInDirection = rect.top >= currentRect.bottom - 5;
        primaryDistance = rect.top - currentRect.bottom;
        secondaryDistance = Math.abs(centerX - currentCenterX);
        break;
      case "left":
        // Pane must be to the left (its right edge left of our left edge)
        isInDirection = rect.right <= currentRect.left + 5;
        primaryDistance = currentRect.left - rect.right;
        secondaryDistance = Math.abs(centerY - currentCenterY);
        break;
      case "right":
        // Pane must be to the right (its left edge right of our right edge)
        isInDirection = rect.left >= currentRect.right - 5;
        primaryDistance = rect.left - currentRect.right;
        secondaryDistance = Math.abs(centerY - currentCenterY);
        break;
    }
    
    if (!isInDirection || primaryDistance < 0) continue;
    
    // Score: prioritize closest in primary direction, then best alignment
    // Lower score = better candidate
    const score = primaryDistance + secondaryDistance * 0.5;
    
    if (score < bestScore) {
      bestScore = score;
      bestCandidate = pane.sessionId;
    }
  }
  
  return bestCandidate;
}

interface AppShellProps {
  uiVariant?: "default" | "cmux";
}

export default function AppShell({ uiVariant = "default" }: AppShellProps) {
  const [showSetup, setShowSetup] = useState(false);
  const workspaces = useWorkspaceListStore((s) => s.workspaces);
  const activeId = useWorkspaceListStore((s) => s.activeWorkspaceId);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setActiveWorkspace = useWorkspaceListStore((s) => s.setActiveWorkspace);
  const removeWorkspace = useWorkspaceListStore((s) => s.removeWorkspace);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setActivePaneId = useUiStore((s) => s.setActivePaneId);
  const activePaneId = useUiStore((s) => s.activePaneId);
  const triggerFlash = usePaneMetadataStore((s) => s.triggerFlash);
  const addPaneToWorkspace = useWorkspaceLayoutStore((s) => s.addPaneToWorkspace);
  const removePaneFromWorkspace = useWorkspaceLayoutStore((s) => s.removePaneFromWorkspace);
  const addTabToPane = useWorkspaceLayoutStore((s) => s.addTabToPane);
  const setIsPaletteOpen = useUiStore((s) => s.setIsPaletteOpen);
  const isPaletteOpen = useUiStore((s) => s.isPaletteOpen);
  const isKeybindingsOpen = useUiStore((s) => s.isKeybindingsOpen);
  const setIsKeybindingsOpen = useUiStore((s) => s.setIsKeybindingsOpen);
  const getActionsForEvent = useKeybindingStore((s) => s.getActionsForEvent);

  const handleNewWorkspace = useCallback(() => {
    setShowSetup(true);
  }, []);

  const handleLaunch = useCallback(
    (
      name: string,
      gridTemplateId: GridTemplateId,
      agentAssignments: Record<number, string>,
      color?: string,
    ) => {
      // Build panes using layout store
      const workspaceId = crypto.randomUUID();
      const panes = useWorkspaceLayoutStore.getState().buildInitialPanes(
        workspaceId, 
        gridTemplateId, 
        agentAssignments
      );
      
      // Create workspace in list store
      useWorkspaceListStore.getState().createWorkspace(
        name,
        gridTemplateId,
        panes,
        color
      );
      
      setShowSetup(false);
    },
    [],
  );

  const handleCloseWorkspace = useCallback(
    (id: string) => {
      const ws = workspaces.find((w) => w.id === id);
      if (ws) {
        for (const pane of ws.panes) {
          for (const tab of pane.tabs) {
            killSession(tab.sessionId).catch(() => {});
          }
        }
      }
      removeWorkspace(id);
    },
    [workspaces, removeWorkspace],
  );

  const handleCancelSetup = useCallback(() => {
    setShowSetup(false);
  }, []);

  // Keyboard shortcuts — use refs so the listener doesn't re-attach on every state change
  const stateRef = useRef({ workspaces, activeId, activePaneId });
  stateRef.current = { workspaces, activeId, activePaneId };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Skip if modals are open
      if (isPaletteOpen || isKeybindingsOpen) return;

      // Get all actions that match this keyboard event (BridgeSpace pattern)
      const actions = getActionsForEvent(e);
      
      // No match → let event pass through to focused element (terminal, input, etc.)
      if (actions.length === 0) return;

      // Match found → prevent default behavior and execute action
      e.preventDefault();
      e.stopImmediatePropagation();

      const action = actions[0]; // Execute first matching action
      const { workspaces: ws, activeId: aid, activePaneId: apid } = stateRef.current;

      // Execute the action based on action ID
      switch (action) {
        case "settings.keybindings":
          setIsKeybindingsOpen(true);
          break;

        case "palette.open":
          setIsPaletteOpen(true);
          break;

        case "pane.flash":
          if (apid) triggerFlash(apid);
          break;

        case "workspace.close":
          if (aid) handleCloseWorkspace(aid);
          break;

        case "sidebar.toggle":
          toggleSidebar();
          break;

        case "workspace.new":
          setShowSetup(true);
          break;

        case "workspace.next":
        case "workspace.prev": {
          if (ws.length < 2) return;
          const idx = ws.findIndex((w) => w.id === aid);
          if (action === "workspace.prev") {
            const prev = (idx - 1 + ws.length) % ws.length;
            setActiveWorkspace(ws[prev].id);
          } else {
            const next = (idx + 1) % ws.length;
            setActiveWorkspace(ws[next].id);
          }
          break;
        }

        case "workspace.jump.1":
        case "workspace.jump.2":
        case "workspace.jump.3":
        case "workspace.jump.4":
        case "workspace.jump.5":
        case "workspace.jump.6":
        case "workspace.jump.7":
        case "workspace.jump.8": {
          const num = parseInt(action.split(".")[2], 10);
          if (ws[num - 1]) setActiveWorkspace(ws[num - 1].id);
          break;
        }

        case "workspace.jump.9":
          if (ws.length) setActiveWorkspace(ws[ws.length - 1].id);
          break;

        case "pane.split.right": {
          const activeWs = ws.find((w) => w.id === aid);
          const activePane = activeWs?.panes.find((p) => p.sessionId === apid);
          if (activeWs && activePane) {
            addPaneToWorkspace(activeWs.id, activePane.id, "right");
          }
          break;
        }

        case "pane.split.down": {
          const activeWs = ws.find((w) => w.id === aid);
          const activePane = activeWs?.panes.find((p) => p.sessionId === apid);
          if (activeWs && activePane) {
            addPaneToWorkspace(activeWs.id, activePane.id, "down");
          }
          break;
        }

        case "pane.close": {
          const activeWs = ws.find((w) => w.id === aid);
          const activePane = activeWs?.panes.find((p) => p.sessionId === apid);
          if (activeWs && activePane) {
            removePaneFromWorkspace(activeWs.id, activePane.id);
          }
          break;
        }

        // Browser pane disabled for now (too laggy)
        // case "pane.newBrowserTab": {
        //   const activeWs = ws.find((w) => w.id === aid);
        //   const activePane = activeWs?.panes.find((p) => p.sessionId === apid);
        //   if (activeWs && activePane) {
        //     addTabToPane(activeWs.id, activePane.id, undefined, "browser");
        //   }
        //   break;
        // }

        case "pane.focus.right":
        case "pane.focus.left":
        case "pane.focus.up":
        case "pane.focus.down": {
          const activeWs = ws.find((w) => w.id === aid);
          if (!activeWs || activeWs.panes.length <= 1 || !apid) return;

          // Map action to direction
          const directionMap: Record<string, Direction> = {
            "pane.focus.right": "right",
            "pane.focus.left": "left",
            "pane.focus.up": "up",
            "pane.focus.down": "down",
          };
          const direction = directionMap[action];
          
          // Find the best pane in the requested direction using DOM positions
          const targetSessionId = findPaneInDirection(apid, direction, activeWs.panes);
          if (!targetSessionId) return; // No pane in that direction
          
          setActivePaneId(targetSessionId);
          
          // Focus the xterm textarea inside the pane for immediate typing
          setTimeout(() => {
            const el = document.querySelector<HTMLElement>(`[data-session-id="${targetSessionId}"]`);
            const textarea = el?.querySelector<HTMLTextAreaElement>("textarea");
            if (textarea) {
              textarea.focus();
            } else {
              el?.focus();
            }
          }, 0);
          break;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    getActionsForEvent,
    isPaletteOpen,
    isKeybindingsOpen,
    setIsKeybindingsOpen,
    setIsPaletteOpen,
    triggerFlash,
    handleCloseWorkspace,
    toggleSidebar,
    setShowSetup,
    setActiveWorkspace,
    addPaneToWorkspace,
    removePaneFromWorkspace,
    addTabToPane,
    setActivePaneId,
  ]);

  return (
    <div
      className={uiVariant === "cmux" ? "ui-cmux" : undefined}
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--cmux-bg)",
      }}
    >
      <SocketListener />
      <TitleBar uiVariant={uiVariant} onNewWorkspace={handleNewWorkspace} />
      <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", minHeight: 0 }}>
        {/* Sidebar — kept mounted so terminals don't remount; width animates to 0 */}
        <div
          style={{
            width: sidebarCollapsed ? 0 : SIDEBAR_WIDTH,
            overflow: "hidden",
            flexShrink: 0,
            transition: "width 0.2s ease",
          }}
        >
          <TabBar
            uiVariant={uiVariant}
            onNewWorkspace={handleNewWorkspace}
            onCloseWorkspace={handleCloseWorkspace}
          />
        </div>

        {/* Main content — WorkspaceView always mounted to keep terminals alive */}
        <div style={{ flex: 1, overflow: "hidden", minWidth: 0, position: "relative" }}>
          <WorkspaceView />
          <CommandPalette />
          {isKeybindingsOpen && <KeybindingsModal onClose={() => setIsKeybindingsOpen(false)} />}
          {showSetup && (
            <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "var(--cmux-bg)" }}>
              <WorkspaceSetup onLaunch={handleLaunch} onCancel={handleCancelSetup} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
