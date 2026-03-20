import { useCallback, useMemo, memo } from "react";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import type { Pane, GridTemplateId } from "../../types";
import { getGridTemplate } from "../../lib/gridTemplates";
import { useWorkspaceLayoutStore } from "../../stores/workspaceStore";
import TerminalPane from "./TerminalPane";
import { ErrorBoundary } from "../layout/ErrorBoundary";

interface TerminalGridProps {
  workspaceId: string;
  gridTemplateId: GridTemplateId;
  panes: Pane[];
  splitRows?: string[][];
}

export default memo(function TerminalGrid({
  workspaceId,
  gridTemplateId,
  panes,
  splitRows,
}: TerminalGridProps) {
  const template = getGridTemplate(gridTemplateId);
  const removePaneFromWorkspace = useWorkspaceLayoutStore((s) => s.removePaneFromWorkspace);
  const addPaneToWorkspace = useWorkspaceLayoutStore((s) => s.addPaneToWorkspace);

  const handleClose = useCallback((paneId: string) => {
    removePaneFromWorkspace(workspaceId, paneId);
  }, [workspaceId, removePaneFromWorkspace]);

  const handleSplitRight = useCallback((paneId: string) => {
    addPaneToWorkspace(workspaceId, paneId, "right");
  }, [workspaceId, addPaneToWorkspace]);

  const handleSplitDown = useCallback((paneId: string) => {
    addPaneToWorkspace(workspaceId, paneId, "down");
  }, [workspaceId, addPaneToWorkspace]);

  const paneMap = useMemo(() => Object.fromEntries(panes.map((p) => [p.id, p])), [panes]);

  // Dynamic layout: when panes exceed template OR we have splitRows
  const useDynamicLayout = panes.length > template.paneCount || !!splitRows;

  // Single pane — no splitting needed
  if (panes.length === 1) {
    return (
      <ErrorBoundary>
      <TerminalPane
        pane={panes[0]}
        workspaceId={workspaceId}
        onSplitRight={() => handleSplitRight(panes[0].id)}
        onSplitDown={() => handleSplitDown(panes[0].id)}
      />
      </ErrorBoundary>
    );
  }

  if (useDynamicLayout) {
    // Use splitRows if available, otherwise flat horizontal layout
    const rows: string[][] = splitRows ?? [panes.map((p) => p.id)];

    return (
      <Allotment vertical separator={false}>
        {rows.map((row, rowIdx) => (
          <Allotment.Pane key={row.join("-") || rowIdx}>
            {row.length === 1 ? (
              (() => {
                const pane = paneMap[row[0]];
                if (!pane) return null;
                return (
                  <ErrorBoundary>
                  <TerminalPane
                    pane={pane}
                    workspaceId={workspaceId}
                    onClose={() => handleClose(pane.id)}
                    onSplitRight={() => handleSplitRight(pane.id)}
                    onSplitDown={() => handleSplitDown(pane.id)}
                  />
                  </ErrorBoundary>
                );
              })()
            ) : (
              <Allotment separator={false}>
                {row.map((paneId) => {
                  const pane = paneMap[paneId];
                  if (!pane) return null;
                  return (
                    <Allotment.Pane key={pane.id}>
                      <ErrorBoundary>
                      <TerminalPane
                        pane={pane}
                        workspaceId={workspaceId}
                        onClose={() => handleClose(pane.id)}
                        onSplitRight={() => handleSplitRight(pane.id)}
                        onSplitDown={() => handleSplitDown(pane.id)}
                      />
                      </ErrorBoundary>
                    </Allotment.Pane>
                  );
                })}
              </Allotment>
            )}
          </Allotment.Pane>
        ))}
      </Allotment>
    );
  }

  // Build rows from template
  const rows: Pane[][] = [];
  let idx = 0;
  for (let r = 0; r < template.rows; r++) {
    const row: Pane[] = [];
    for (let c = 0; c < template.cols; c++) {
      if (idx < panes.length) {
        row.push(panes[idx]);
        idx++;
      }
    }
    if (row.length > 0) rows.push(row);
  }

  return (
    <Allotment vertical separator={false}>
      {rows.map((row) => (
        <Allotment.Pane key={row.map((p) => p.id).join("-")}>
          <Allotment separator={false}>
            {row.map((pane) => (
              <Allotment.Pane key={pane.id}>
                <ErrorBoundary>
                <TerminalPane
                  pane={pane}
                  workspaceId={workspaceId}
                  onClose={() => handleClose(pane.id)}
                  onSplitRight={() => handleSplitRight(pane.id)}
                  onSplitDown={() => handleSplitDown(pane.id)}
                />
                </ErrorBoundary>
              </Allotment.Pane>
            ))}
          </Allotment>
        </Allotment.Pane>
      ))}
    </Allotment>
  );
});
