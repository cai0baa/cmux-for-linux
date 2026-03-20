export type TerminalStatus = "starting" | "running" | "exited" | "error";

export interface TerminalSession {
  sessionId: string;
  paneId: string;
  workspaceId: string;
  agentId: string;
  status: TerminalStatus;
  /** Exit code if exited */
  exitCode?: number;
}
