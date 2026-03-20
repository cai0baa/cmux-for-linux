import { invoke, Channel } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export async function createSession(
  sessionId: string,
  command: string,
  args: string[],
  cols: number,
  rows: number,
  onData: (data: ArrayBuffer) => void,
  cwd?: string,
): Promise<void> {
  const channel = new Channel<ArrayBuffer>();
  channel.onmessage = onData;
  return invoke("create_session", {
    sessionId,
    command,
    args,
    cols,
    rows,
    onData: channel,
    cwd: cwd ?? null,
  });
}

export async function writeToSession(
  sessionId: string,
  data: string,
): Promise<void> {
  return invoke("write_to_session", { sessionId, data });
}

export async function resizeSession(
  sessionId: string,
  cols: number,
  rows: number,
): Promise<void> {
  return invoke("resize_session", { sessionId, cols, rows });
}

export async function killSession(sessionId: string): Promise<void> {
  return invoke("kill_session", { sessionId });
}

export function onPtyExit(
  sessionId: string,
  callback: () => void,
): Promise<UnlistenFn> {
  return listen(`pty-exit-${sessionId}`, () => {
    callback();
  });
}

export interface PtyMetadata {
  session_id: string;
  cwd: string;
  git_branch?: string;
  process_name?: string;
}

export function onPtyMetadata(
  callback: (meta: PtyMetadata) => void,
): Promise<UnlistenFn> {
  return listen<PtyMetadata>("pty_metadata", (event) => {
    callback(event.payload);
  });
}

// ─── Terminal config ─────────────────────────────────────────────────────────

export interface TerminalConfig {
  font_family: string;
  font_size: number;
  shell: string;
  background: string;
  foreground: string;
  ansi: string[];
}

export async function getTerminalConfig(): Promise<TerminalConfig> {
  return invoke("get_terminal_config");
}

export async function getAllCwds(): Promise<Record<string, string>> {
  return invoke("get_all_cwds");
}

// Preload config so it's cached before first terminal mounts
let _configCache: Promise<TerminalConfig> | null = null;
export function preloadTerminalConfig(): void {
  if (!_configCache) {
    _configCache = getTerminalConfig().catch(() => null as never);
  }
}

// ─── Window / leader election ────────────────────────────────────────────────

export async function claimLeader(): Promise<boolean> {
  return invoke("claim_leader");
}

export async function getWindowCount(): Promise<number> {
  return invoke("get_window_count");
}

// ─── Persistence commands ────────────────────────────────────────────────────

export interface PaneConfig {
  agent_id: string;
  label: string | null;
  cwd?: string | null;
}

export interface WorkspaceConfig {
  id: string;
  name: string;
  grid_template_id: string;
  panes: PaneConfig[];
  created_at: number;
}

export interface AppSettings {
  font_size: number;
  theme_id: string;
  keybindings?: Record<string, string>;
}

export interface PersistentData {
  workspaces: WorkspaceConfig[];
  settings: AppSettings;
}

export async function loadPersistentData(): Promise<PersistentData> {
  return invoke("load_persistent_data");
}

export async function saveWorkspaces(
  workspaces: WorkspaceConfig[],
): Promise<void> {
  return invoke("save_workspaces", { workspaces });
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  return invoke("save_settings", { settings });
}

export async function sendSocketResponse(id: number, result: any, error: string | null): Promise<void> {
  return invoke("socket_response", { id, result, error });
}
