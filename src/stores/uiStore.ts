import { create } from "zustand";

/**
 * UI Store - Manages UI-only state (sidebar, palette, zoom)
 * Isolated from workspace/pane data to prevent unnecessary re-renders
 */
interface UiState {
  sidebarCollapsed: boolean;
  isPaletteOpen: boolean;
  isKeybindingsOpen: boolean;
  activePaneId: string | null;
  zoomedPaneId: string | null;

  toggleSidebar: () => void;
  togglePalette: () => void;
  setIsPaletteOpen: (open: boolean) => void;
  setIsKeybindingsOpen: (open: boolean) => void;
  setActivePaneId: (id: string | null) => void;
  setZoomedPaneId: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  isPaletteOpen: false,
  isKeybindingsOpen: false,
  activePaneId: null,
  zoomedPaneId: null,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  togglePalette: () => set((state) => ({ isPaletteOpen: !state.isPaletteOpen })),
  setIsPaletteOpen: (open) => set({ isPaletteOpen: open }),
  setIsKeybindingsOpen: (open) => set({ isKeybindingsOpen: open }),
  setActivePaneId: (id) => set({ activePaneId: id }),
  setZoomedPaneId: (id) => set({ zoomedPaneId: id }),
}));
