import { create } from "zustand";

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
