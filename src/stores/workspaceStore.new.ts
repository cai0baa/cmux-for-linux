/**
 * MIGRATION LAYER: Re-exports new split stores with backward compatibility
 * 
 * OLD STRUCTURE (monolithic):
 * - workspaceStore.ts: All workspace, pane, tab, and UI state
 * 
 * NEW STRUCTURE (split):
 * - workspaceListStore.ts: Workspace CRUD + active selection
 * - workspaceLayoutStore.ts: Pane/tab management within workspaces  
 * - uiStore.ts: UI state (sidebar, palette, zoom)
 * - paneMetadataStore.ts: Pane metadata (already separate)
 * 
 * This file provides backward-compatible exports so existing components
 * can continue working while we migrate them one by one.
 */

// Re-export the new stores
export { useWorkspaceListStore } from "./workspaceListStore";
export { useWorkspaceLayoutStore } from "./workspaceLayoutStore";
export { useUiStore } from "./uiStore";

// Re-export pane metadata store (unchanged)
export { usePaneMetadataStore } from "./paneMetadataStoreCompat";

// Re-export types
export type { PaneMetadata, PaneMetadataState } from "./paneMetadataStoreCompat";

/**
 * DEPRECATED: Use individual stores instead
 * 
 * Migration guide:
 * - Workspace list operations → useWorkspaceListStore
 * - Pane/tab operations → useWorkspaceLayoutStore
 * - UI state (sidebar, palette) → useUiStore
 * - Pane metadata (notifications, cwd) → usePaneMetadataStore
 * 
 * Example:
 * ```ts
 * // Old (causes unnecessary re-renders):
 * const { activeWorkspaceId, isPaletteOpen } = useWorkspaceStore();
 * 
 * // New (only re-renders when specific slice changes):
 * const activeWorkspaceId = useWorkspaceListStore(s => s.activeWorkspaceId);
 * const isPaletteOpen = useUiStore(s => s.isPaletteOpen);
 * ```
 */
export function useWorkspaceStore() {
  throw new Error(
    "useWorkspaceStore() is deprecated. Use useWorkspaceListStore(), useWorkspaceLayoutStore(), or useUiStore() instead."
  );
}
