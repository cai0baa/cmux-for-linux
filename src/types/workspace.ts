export type GridTemplateId =
  | "1x1"
  | "2x1"
  | "1x2"
  | "2x2"
  | "3x2"
  | "2x3"
  | "3x3"
  | "4x4";

export interface GridTemplate {
  id: GridTemplateId;
  label: string;
  rows: number;
  cols: number;
  /** Total number of panes */
  paneCount: number;
}

export interface PaneTab {
  id: string;
  sessionId: string;
  agentId: string;
  label?: string;
  /** 'terminal' or 'browser' */
  type?: "terminal" | "browser";
}

export interface Pane {
  id: string;
  /** Default agent for new tabs */
  agentId: string;
  /** Active tab session ID — kept for backward compat */
  sessionId: string;
  tabs: PaneTab[];
  activeTabId: string;
  /** Custom label override */
  label?: string;
  cwd?: string;
  gitBranch?: string;
}

export type WorkspaceStatus = "setup" | "running" | "stopped";

export interface Workspace {
  id: string;
  name: string;
  gridTemplateId: GridTemplateId;
  panes: Pane[];
  status: WorkspaceStatus;
  createdAt: number;
  color?: string;
  /** Each entry is a row of pane IDs for dynamic split tracking */
  splitRows?: string[][];
}
