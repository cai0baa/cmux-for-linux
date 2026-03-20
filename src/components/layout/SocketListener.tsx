import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { 
  useWorkspaceListStore, 
  useWorkspaceLayoutStore, 
  useUiStore 
} from "../../stores/workspaceStore";
import { sendSocketResponse } from "../../lib/ipc";
import { useThemeStore } from "../../stores/themeStore";

interface SocketRequest {
  id: number;
  cmd: string;
  args: any;
}

export default function SocketListener() {
  useEffect(() => {
    const unlisten = listen<SocketRequest>("socket-request", async (event) => {
      const { id, cmd, args } = event.payload;
      let result = null;
      let error = null;

      try {
        const listStore = useWorkspaceListStore.getState();
        const layoutStore = useWorkspaceLayoutStore.getState();
        const uiStore = useUiStore.getState();
        
        switch (cmd) {
          case "workspace.list":
            result = listStore.workspaces.map(w => ({
              id: w.id,
              name: w.name,
              status: w.status,
              active: listStore.activeWorkspaceId === w.id,
            }));
            break;
            
          case "workspace.new":
            const workspaceId = crypto.randomUUID();
            const template = args?.template || "1x1";
            const panes = layoutStore.buildInitialPanes(workspaceId, template);
            const ws = listStore.createWorkspace(
              args?.name || `Workspace ${listStore.workspaces.length + 1}`,
              template,
              panes
            );
            result = { id: ws.id, name: ws.name };
            break;
            
          case "workspace.select":
            if (args?.id) {
              listStore.setActiveWorkspace(args.id);
              result = { success: true };
            } else {
              error = "Missing id argument";
            }
            break;
            
          case "workspace.close":
            if (args?.id) {
              listStore.removeWorkspace(args.id);
              result = { success: true };
            } else {
              error = "Missing id argument";
            }
            break;

          case "pane.split-right":
            if (listStore.activeWorkspaceId && uiStore.activePaneId) {
              layoutStore.addPaneToWorkspace(listStore.activeWorkspaceId, uiStore.activePaneId, "right");
              result = { success: true };
            } else {
              error = "No active pane to split";
            }
            break;

          case "pane.split-down":
            if (listStore.activeWorkspaceId && uiStore.activePaneId) {
              layoutStore.addPaneToWorkspace(listStore.activeWorkspaceId, uiStore.activePaneId, "down");
              result = { success: true };
            } else {
              error = "No active pane to split";
            }
            break;

          case "pane.close":
            if (listStore.activeWorkspaceId && uiStore.activePaneId) {
              layoutStore.removePaneFromWorkspace(listStore.activeWorkspaceId, uiStore.activePaneId);
              result = { success: true };
            } else {
              error = "No active pane to close";
            }
            break;

          case "theme.set":
            if (args?.id) {
              useThemeStore.getState().setTheme(args.id);
              result = { success: true };
            } else {
              error = "Missing id argument";
            }
            break;

          default:
            error = `Unknown command: ${cmd}`;
        }
      } catch (err: any) {
        error = err.toString();
      }

      await sendSocketResponse(id, result, error);
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  return null;
}
