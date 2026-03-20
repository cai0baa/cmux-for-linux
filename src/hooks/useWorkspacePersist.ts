import { useEffect, useRef } from "react";
import { 
  useWorkspaceListStore, 
  useWorkspaceLayoutStore,
  usePaneMetadataStore 
} from "../stores/workspaceStore";
import {
  loadPersistentData,
  saveWorkspaces,
  getAllCwds,
  claimLeader,
  saveSettings,
  type WorkspaceConfig,
} from "../lib/ipc";
import type { Workspace } from "../types";
import { useThemeStore } from "../stores/themeStore";
import { useKeybindingStore } from "../stores/keybindingStore";

function toConfig(ws: Workspace, cwds: Record<string, string>): WorkspaceConfig {
  const metaState = usePaneMetadataStore.getState().metadata;
  return {
    id: ws.id,
    name: ws.name,
    grid_template_id: ws.gridTemplateId,
    panes: ws.panes.map((p) => ({
      agent_id: p.agentId,
      label: p.label ?? null,
      cwd: cwds[p.sessionId] ?? metaState[p.sessionId]?.cwd ?? p.cwd ?? null,
    })),
    created_at: ws.createdAt,
  };
}

export function useWorkspacePersist() {
  const loaded = useRef(false);
  const isLeader = useRef(false);

  // Load on mount — only leader bootstraps
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    claimLeader()
      .then((gotLeadership) => {
        isLeader.current = gotLeadership;
        if (!gotLeadership) {
          // Follower window: skip bootstrap entirely
          return;
        }
        // Leader: load persisted data
        return loadPersistentData().then((data) => {
          useThemeStore.getState().hydrateSettings({
            themeId: data.settings.theme_id,
            fontSize: data.settings.font_size,
          });
          useKeybindingStore.getState().hydrateOverrides(data.settings.keybindings ?? {});

          if (data.workspaces.length > 0) {
            const listStore = useWorkspaceListStore.getState();
            const layoutStore = useWorkspaceLayoutStore.getState();
            
            if (listStore.workspaces.length <= 1) {
              for (const cfg of data.workspaces) {
                const workspaceId = crypto.randomUUID();
                const agentAssignments = Object.fromEntries(
                  cfg.panes.map((p, i) => [i, p.agent_id]),
                );
                const panes = layoutStore.buildInitialPanes(
                  workspaceId, 
                  cfg.grid_template_id as Workspace["gridTemplateId"],
                  agentAssignments
                );
                
                // Apply persisted CWDs to panes
                cfg.panes.forEach((p, i) => {
                  if (p.cwd && panes[i]) {
                    panes[i].cwd = p.cwd;
                  }
                });
                
                listStore.createWorkspace(
                  cfg.name,
                  cfg.grid_template_id as Workspace["gridTemplateId"],
                  panes,
                );
              }
              const bootstrapWs = listStore.workspaces[0];
              if (bootstrapWs && data.workspaces.length > 0) {
                listStore.removeWorkspace(bootstrapWs.id);
              }
            }
          }
        });
      })
      .catch((err) => {
        console.warn("[persist] Failed to load:", err);
      });
  }, []);

  // Auto-save — only leader saves
  useEffect(() => {
    let lastCwds: Record<string, string> = {};

    const sync = async () => {
      if (!isLeader.current) return; // Only leader saves
      try {
        lastCwds = await getAllCwds();
        const state = useWorkspaceListStore.getState();
        const configs = state.workspaces.map((ws) => toConfig(ws, lastCwds));
        await saveWorkspaces(configs);

        const themeState = useThemeStore.getState();
        const keybindingState = useKeybindingStore.getState();
        await saveSettings({
          theme_id: themeState.themeId,
          font_size: themeState.fontSize,
          keybindings: keybindingState.overrides,
        });
      } catch (err) {
        console.warn("[persist] Failed to save with CWD:", err);
      }
    };

    const unsub = useWorkspaceListStore.subscribe(() => {
      sync();
    });

    const interval = setInterval(sync, 10000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);
}
