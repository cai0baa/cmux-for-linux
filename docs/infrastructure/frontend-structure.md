# Frontend Structure

## Component Tree

```
App
└── AppShell
    ├── TitleBar                    — Custom 32px title bar
    ├── TabBar (sidebar)            — Workspace list
    │   ├── ThemeSwitcher
    │   └── TabItem × N            — Per-workspace tab
    ├── WorkspaceView               — Active workspace content
    │   └── TerminalGrid            — Allotment split layout
    │       └── TerminalPane × N    — Pane container
    │           ├── PaneTabBar      — Tab strip + split/close
    │           ├── XTermWrapper    — xterm.js terminal
    │           └── BrowserPane     — iframe browser (if tab.type=browser)
    └── WorkspaceSetup (modal)      — New workspace wizard
        ├── GridPicker + GridPreview
        └── AgentSelector + AgentSlotList
```

## Stores

### `workspaceStore` + `usePaneMetadataStore` (`stores/workspaceStore.ts`)

**Workspace state:**

```typescript
interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  sidebarCollapsed: boolean;
  activePaneId: string | null;
  // ... actions
}
```

**Pane metadata state** (co-located in same file):

```typescript
interface PaneMetadataState {
  metadata: Record<string, { lastLogLine?: string; notificationCount?: number }>;
  flashingPaneIds: Set<string>;
  // ... actions
}
```

### `themeStore` (`stores/themeStore.ts`)

```typescript
interface ThemeState {
  themeId: string;            // default: "midnight"
  theme: ThemeDefinition;
  fontSize: number;           // default: 14, range: 10–24
}
```

### `terminalStore` (`stores/terminalStore.ts`)

```typescript
interface TerminalState {
  sessions: Record<string, TerminalSession>;
  // registerSession, updateStatus, removeSession, removeSessionsByWorkspace
}
```

## Hooks

| Hook | Purpose |
|------|---------|
| `useWorkspacePersist` | Auto-loads workspaces on mount, subscribes to store changes for auto-save |

## Types

### `workspace.ts`

```typescript
type GridTemplateId = "1x1" | "2x1" | "1x2" | "2x2" | "3x2" | "2x3" | "3x3" | "4x4";

interface PaneTab {
  id: string;
  sessionId: string;
  agentId: string;
  label?: string;
  type?: "terminal" | "browser";
}

interface Pane {
  id: string;
  agentId: string;
  sessionId: string;    // active tab's session
  tabs: PaneTab[];
  activeTabId: string;
  label?: string;
  cwd?: string;
  gitBranch?: string;
}

interface Workspace {
  id: string;
  name: string;
  gridTemplateId: GridTemplateId;
  panes: Pane[];
  status: "setup" | "running" | "stopped";
  createdAt: number;
  color?: string;
  splitRows?: string[][]; // dynamic split tracking
}
```

### `theme.ts`

```typescript
interface ThemeDefinition {
  id: string;
  name: string;
  terminal: TerminalColors;  // 20 color slots (bg, fg, cursor, selection, 16 ANSI)
  chrome: {                  // UI chrome colors
    background: string;
    surface: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
  };
}
```

### `agent.ts`

```typescript
interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
  icon: string;
  color: string;
}
```

## IPC Functions (`lib/ipc.ts`)

| Function | Direction | Transport |
|----------|-----------|-----------|
| `createSession` | FE → BE | invoke + Channel (binary streaming) |
| `writeToSession` | FE → BE | invoke |
| `resizeSession` | FE → BE | invoke |
| `killSession` | FE → BE | invoke |
| `getTerminalConfig` | FE → BE | invoke |
| `onPtyExit` | BE → FE | event listener (`pty-exit-{id}`) |
| `onPtyMetadata` | BE → FE | event listener (`pty_metadata`) |
| `loadPersistentData` | FE → BE | invoke |
| `saveWorkspaces` | FE → BE | invoke |
| `saveSettings` | FE → BE | invoke |
| `preloadTerminalConfig` | FE (cache) | wraps getTerminalConfig |

## Constants (`lib/constants.ts`)

| Constant | Value | Usage |
|----------|-------|-------|
| `DEFAULT_SHELL` | `"/bin/bash"` | Fallback shell |
| `DEFAULT_FONT_SIZE` | `14` | Default terminal font size |
| `MIN_FONT_SIZE` / `MAX_FONT_SIZE` | `10` / `24` | Font size bounds |
| `PANE_HEADER_HEIGHT` | `36` | PaneTabBar height in px |
| `TAB_BAR_HEIGHT` | `36` | Sidebar tab height in px |
| `SIDEBAR_WIDTH` | `200` | Sidebar width in px |
| `RESIZE_DEBOUNCE_MS` | `100` | Resize debounce (XTermWrapper uses 50ms) |
| `INIT_DELAY_MS` | `300` | Init delay constant |
