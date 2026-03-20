import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type { Workspace, Pane, PaneTab, GridTemplateId } from "../types";
import { getGridTemplate } from "../lib/gridTemplates";
import { getDefaultAgent } from "../lib/agents";
import { makeSessionId } from "../lib/constants";

export interface PaneMetadata {
  lastLogLine?: string;
  notificationCount?: number;
  cwd?: string;
  gitBranch?: string;
  processTitle?: string;
}

export interface PaneMetadataState {
  metadata: Record<string, PaneMetadata>;
  flashingPaneIds: Set<string>;
  setMetadata: (sessionId: string, data: Partial<PaneMetadata>) => void;
  incrementNotification: (sessionId: string) => void;
  clearNotification: (sessionId: string) => void;
  triggerFlash: (sessionId: string) => void;
}

export const usePaneMetadataStore = create<PaneMetadataState>((set) => ({
  metadata: {},
  flashingPaneIds: new Set(),
  setMetadata: (sessionId, data) => set((state) => {
    const start = performance.now();
    const prev = state.metadata[sessionId];
    // Skip update if nothing actually changed
    if (prev) {
      const keys = Object.keys(data) as (keyof PaneMetadata)[];
      const changed = keys.some((k) => prev[k] !== data[k]);
      if (!changed) {
        console.log(`[PERF] setMetadata skipped (no changes) - ${(performance.now() - start).toFixed(2)}ms`);
        return state;
      }
    }
    const result = {
      metadata: {
        ...state.metadata,
        [sessionId]: { ...prev, ...data },
      },
    };
    console.log(`[PERF] setMetadata completed - ${(performance.now() - start).toFixed(2)}ms`);
    return result;
  }),
  incrementNotification: (sessionId) => set((state) => {
    const start = performance.now();
    const prev = state.metadata[sessionId];
    const oldCount = prev?.notificationCount || 0;
    const result = {
      metadata: {
        ...state.metadata,
        [sessionId]: { ...prev, notificationCount: oldCount + 1 },
      },
    };
    console.log(`[PERF] incrementNotification (${oldCount} -> ${oldCount + 1}) - ${(performance.now() - start).toFixed(2)}ms`);
    return result;
  }),
  clearNotification: (sessionId) => set((state) => ({
    metadata: {
      ...state.metadata,
      [sessionId]: {
        ...state.metadata[sessionId],
        notificationCount: 0
      }
    }
  })),
  triggerFlash: (sessionId) => {
    set((state) => {
      const next = new Set(state.flashingPaneIds);
      next.add(sessionId);
      return { flashingPaneIds: next };
    });
    setTimeout(() => {
      set((state) => {
        const next = new Set(state.flashingPaneIds);
        next.delete(sessionId);
        return { flashingPaneIds: next };
      });
    }, 900);
  },
}));

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  sidebarCollapsed: boolean;
  activePaneId: string | null;
  zoomedPaneId: string | null;
  isPaletteOpen: boolean;
  isKeybindingsOpen: boolean;

  // Getters
  getActiveWorkspace: () => Workspace | undefined;

  // Workspace actions
  createWorkspace: (
    name: string,
    gridTemplateId: GridTemplateId,
    agentAssignments?: Record<number, string>,
    color?: string,
  ) => Workspace;
  removeWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  setWorkspaceStatus: (id: string, status: Workspace["status"]) => void;
  toggleSidebar: () => void;
  togglePalette: () => void;
  setIsPaletteOpen: (open: boolean) => void;
  setIsKeybindingsOpen: (open: boolean) => void;
  setActivePaneId: (id: string | null) => void;
  setZoomedPaneId: (id: string | null) => void;

  // Pane actions
  removePaneFromWorkspace: (workspaceId: string, paneId: string) => void;
  addPaneToWorkspace: (workspaceId: string, afterPaneId: string, direction: "right" | "down", agentId?: string) => void;

  // Tab actions
  addTabToPane: (workspaceId: string, paneId: string, agentId?: string, type?: PaneTab["type"]) => void;
  removeTabFromPane: (workspaceId: string, paneId: string, tabId: string) => void;
  setActivePaneTab: (workspaceId: string, paneId: string, tabId: string) => void;
}

function makeTab(workspaceId: string, paneId: string, agentId: string, type: PaneTab["type"] = "terminal"): PaneTab {
  const tabId = uuid();
  return {
    id: tabId,
    sessionId: makeSessionId(workspaceId, `${paneId}-${tabId}`),
    agentId,
    type,
  };
}

function buildPanes(
  workspaceId: string,
  gridTemplateId: GridTemplateId,
  agentAssignments?: Record<number, string>,
): Pane[] {
  const template = getGridTemplate(gridTemplateId);
  const defaultAgentId = getDefaultAgent().id;
  const panes: Pane[] = [];

  for (let i = 0; i < template.paneCount; i++) {
    const paneId = uuid();
    const agentId = agentAssignments?.[i] ?? defaultAgentId;
    const tab = makeTab(workspaceId, paneId, agentId);
    panes.push({
      id: paneId,
      agentId,
      sessionId: tab.sessionId,
      tabs: [tab],
      activeTabId: tab.id,
    });
  }

  return panes;
}

const WORKSPACE_COLORS = ["#89b4fa", "#a6e3a1", "#f9e2af", "#f38ba8", "#94e2d5", "#f5c2e7"];

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  sidebarCollapsed: false,
  activePaneId: null,
  zoomedPaneId: null,
  isPaletteOpen: false,
  isKeybindingsOpen: false,

  getActiveWorkspace: () => {
    const { workspaces, activeWorkspaceId } = get();
    return workspaces.find((w) => w.id === activeWorkspaceId);
  },

  createWorkspace: (name, gridTemplateId, agentAssignments, color) => {
    performance.mark('workspace-create-start');
    
    const id = uuid();
    const { workspaces } = get();
    const autoColor = color ?? WORKSPACE_COLORS[workspaces.length % WORKSPACE_COLORS.length];
    const workspace: Workspace = {
      id,
      name,
      gridTemplateId,
      panes: buildPanes(id, gridTemplateId, agentAssignments),
      status: "running",
      createdAt: Date.now(),
      color: autoColor,
    };

    set((state) => ({
      workspaces: [...state.workspaces, workspace],
      activeWorkspaceId: id,
    }));

    performance.mark('workspace-create-end');
    performance.measure('workspace-create', 'workspace-create-start', 'workspace-create-end');
    const measures = performance.getEntriesByName('workspace-create');
    if (measures.length > 0) {
      console.log(`[PERF] Workspace create: ${measures[measures.length - 1].duration.toFixed(2)}ms`);
    }

    return workspace;
  },

  removeWorkspace: (id) => {
    set((state) => {
      const remaining = state.workspaces.filter((w) => w.id !== id);
      const newActiveId =
        state.activeWorkspaceId === id
          ? remaining[remaining.length - 1]?.id ?? null
          : state.activeWorkspaceId;
      return { workspaces: remaining, activeWorkspaceId: newActiveId };
    });
  },

  removePaneFromWorkspace: (workspaceId, paneId) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) => {
        if (w.id !== workspaceId) return w;
        if (w.panes.length <= 1) return w; // never remove last pane
        const newPanes = w.panes.filter((p) => p.id !== paneId);
        // Update splitRows if present
        let newSplitRows = w.splitRows;
        if (newSplitRows) {
          newSplitRows = newSplitRows
            .map((row) => row.filter((id) => id !== paneId))
            .filter((row) => row.length > 0);
        }
        return { ...w, panes: newPanes, splitRows: newSplitRows };
      }),
    }));
  },

  addPaneToWorkspace: (workspaceId, afterPaneId, direction, agentId) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) => {
        if (w.id !== workspaceId) return w;
        const agId = agentId ?? w.panes.find((p) => p.id === afterPaneId)?.agentId ?? getDefaultAgent().id;
        const paneId = uuid();
        const tab = makeTab(workspaceId, paneId, agId);
        const newPane: Pane = {
          id: paneId,
          agentId: agId,
          sessionId: tab.sessionId,
          tabs: [tab],
          activeTabId: tab.id,
        };
        const newPanes = [...w.panes, newPane];

        // Initialize splitRows if not present
        const existingRows: string[][] = w.splitRows ?? [w.panes.map((p) => p.id)];

        let newSplitRows: string[][];
        if (direction === "right") {
          // Insert new pane ID after afterPaneId in its row
          newSplitRows = existingRows.map((row) => {
            const idx = row.indexOf(afterPaneId);
            if (idx === -1) return row;
            const newRow = [...row];
            newRow.splice(idx + 1, 0, paneId);
            return newRow;
          });
        } else {
          // direction === "down": insert new row after the row containing afterPaneId
          newSplitRows = [];
          for (const row of existingRows) {
            newSplitRows.push(row);
            if (row.includes(afterPaneId)) {
              newSplitRows.push([paneId]);
            }
          }
        }

        return { ...w, panes: newPanes, splitRows: newSplitRows };
      }),
    }));
  },

  addTabToPane: (workspaceId, paneId, agentId, type = "terminal") => {
    performance.mark('tab-create-start');
    
    set((state) => ({
      workspaces: state.workspaces.map((w) => {
        if (w.id !== workspaceId) return w;
        return {
          ...w,
          panes: w.panes.map((p) => {
            if (p.id !== paneId) return p;
            const agId = agentId ?? p.agentId;
            const tab = makeTab(workspaceId, paneId, agId, type);
            return {
              ...p,
              tabs: [...p.tabs, tab],
              activeTabId: tab.id,
              sessionId: tab.sessionId,
            };
          }),
        };
      }),
    }));

    performance.mark('tab-create-end');
    performance.measure('tab-create', 'tab-create-start', 'tab-create-end');
    const measures = performance.getEntriesByName('tab-create');
    if (measures.length > 0) {
      console.log(`[PERF] Tab create: ${measures[measures.length - 1].duration.toFixed(2)}ms`);
    }
  },

  removeTabFromPane: (workspaceId, paneId, tabId) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) => {
        if (w.id !== workspaceId) return w;
        return {
          ...w,
          panes: w.panes.flatMap((p) => {
            if (p.id !== paneId) return [p];
            const remaining = p.tabs.filter((t) => t.id !== tabId);
            if (remaining.length === 0) return []; // remove pane if no tabs left
            const newActiveId = p.activeTabId === tabId
              ? remaining[remaining.length - 1].id
              : p.activeTabId;
            const activeTab = remaining.find((t) => t.id === newActiveId) ?? remaining[0];
            return [{ ...p, tabs: remaining, activeTabId: newActiveId, sessionId: activeTab.sessionId }];
          }),
        };
      }),
    }));
  },

  setActivePaneTab: (workspaceId, paneId, tabId) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) => {
        if (w.id !== workspaceId) return w;
        return {
          ...w,
          panes: w.panes.map((p) => {
            if (p.id !== paneId) return p;
            const tab = p.tabs.find((t) => t.id === tabId);
            if (!tab) return p;
            return { ...p, activeTabId: tabId, sessionId: tab.sessionId };
          }),
        };
      }),
    }));
  },

  setActiveWorkspace: (id) => {
    performance.mark('workspace-switch-start');
    set({ activeWorkspaceId: id, zoomedPaneId: null });
    performance.mark('workspace-switch-end');
    performance.measure('workspace-switch', 'workspace-switch-start', 'workspace-switch-end');
    
    const measures = performance.getEntriesByName('workspace-switch');
    if (measures.length > 0) {
      const duration = measures[measures.length - 1].duration;
      console.log(`[PERF] Workspace switch: ${duration.toFixed(2)}ms`);
    }
  },

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  togglePalette: () => set((state) => ({ isPaletteOpen: !state.isPaletteOpen })),
  
  setIsPaletteOpen: (open) => set({ isPaletteOpen: open }),

  setIsKeybindingsOpen: (open) => set({ isKeybindingsOpen: open }),

  setActivePaneId: (id) => set({ activePaneId: id }),

  setZoomedPaneId: (id) => set({ zoomedPaneId: id }),

  renameWorkspace: (id, name) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id ? { ...w, name } : w,
      ),
    }));
  },

  setWorkspaceStatus: (id, status) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id ? { ...w, status } : w,
      ),
    }));
  },

}));
