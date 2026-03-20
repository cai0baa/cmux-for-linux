import { useEffect, useState } from "react";
import { 
  useWorkspaceListStore, 
  useWorkspaceLayoutStore,
  usePaneMetadataStore 
} from "./stores/workspaceStore";
import { useWorkspacePersist } from "./hooks/useWorkspacePersist";
import { preloadTerminalConfig, onPtyMetadata } from "./lib/ipc";
import AppShell from "./components/layout/AppShell";

// Kick off config fetch immediately — will be cached by the time terminals mount
preloadTerminalConfig();

function App() {
  const [ready, setReady] = useState(false);
  const uiVariant = import.meta.env.VITE_UI_VARIANT === "cmux" ? "cmux" : "default";

  useWorkspacePersist();

  useEffect(() => {
    const listStore = useWorkspaceListStore.getState();
    if (listStore.workspaces.length === 0) {
      // Create initial workspace
      const workspaceId = crypto.randomUUID();
      const panes = useWorkspaceLayoutStore.getState().buildInitialPanes(workspaceId, "1x1");
      listStore.createWorkspace("Terminal", "1x1", panes);
    }
    setReady(true);

    const unlistenPromise = onPtyMetadata((meta) => {
      usePaneMetadataStore.getState().setMetadata(meta.session_id, {
        cwd: meta.cwd,
        gitBranch: meta.git_branch,
        processTitle: meta.process_name ?? undefined,
      });
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  if (!ready) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#0a0a0a",
        }}
      />
    );
  }

  return <AppShell uiVariant={uiVariant} />;
}

export default App;
