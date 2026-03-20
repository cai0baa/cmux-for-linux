import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type { Workspace, GridTemplateId } from "../types";

const WORKSPACE_COLORS = ["#89b4fa", "#a6e3a1", "#f9e2af", "#f38ba8", "#94e2d5", "#f5c2e7"];

/**
 * Workspace List Store - Manages workspace CRUD and active selection
 * Separated from layout/panes to minimize re-renders
 */
interface WorkspaceListState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;

  // Getters
  getActiveWorkspace: () => Workspace | undefined;
  getWorkspace: (id: string) => Workspace | undefined;

  // Workspace CRUD
  createWorkspace: (
    name: string,
    gridTemplateId: GridTemplateId,
    panes: Workspace["panes"],
    color?: string,
  ) => Workspace;
  removeWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  setWorkspaceStatus: (id: string, status: Workspace["status"]) => void;
  
  // Internal update for layout store to modify panes
  _updateWorkspacePanes: (id: string, panes: Workspace["panes"], splitRows?: string[][]) => void;
}

export const useWorkspaceListStore = create<WorkspaceListState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,

  getActiveWorkspace: () => {
    const { workspaces, activeWorkspaceId } = get();
    return workspaces.find((w) => w.id === activeWorkspaceId);
  },

  getWorkspace: (id) => {
    return get().workspaces.find((w) => w.id === id);
  },

  createWorkspace: (name, gridTemplateId, panes, color) => {
    const start = performance.now();
    
    const id = uuid();
    const { workspaces } = get();
    const autoColor = color ?? WORKSPACE_COLORS[workspaces.length % WORKSPACE_COLORS.length];
    
    const workspace: Workspace = {
      id,
      name,
      gridTemplateId,
      panes,
      status: "running",
      createdAt: Date.now(),
      color: autoColor,
    };

    set((state) => ({
      workspaces: [...state.workspaces, workspace],
      activeWorkspaceId: id,
    }));

    console.log(`[PERF] Workspace create (list store): ${(performance.now() - start).toFixed(2)}ms`);
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

  setActiveWorkspace: (id) => {
    const start = performance.now();
    set({ activeWorkspaceId: id });
    console.log(`[PERF] Workspace switch (list store): ${(performance.now() - start).toFixed(2)}ms`);
  },

  renameWorkspace: (id, name) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id ? { ...w, name } : w
      ),
    }));
  },

  setWorkspaceStatus: (id, status) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id ? { ...w, status } : w
      ),
    }));
  },

  _updateWorkspacePanes: (id, panes, splitRows) => {
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id
          ? { ...w, panes, ...(splitRows !== undefined && { splitRows }) }
          : w
      ),
    }));
  },
}));
