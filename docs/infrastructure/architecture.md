# Architecture

## Process Model

```
┌─────────────────────────────────────────┐
│  Tauri Native Process (Rust)            │
│  ├── AppState { SessionManager }        │
│  ├── PTY sessions (one per tab)         │
│  ├── PTY monitor thread (2s polling)    │
│  └── JSON file persistence              │
└─────────┬───────────────────────────────┘
          │ IPC: invoke() + Channel<Vec<u8>> + events
┌─────────▼───────────────────────────────┐
│  Webview (React + xterm.js)             │
│  ├── Zustand stores (workspace, theme)  │
│  ├── xterm.js terminals (WebGL)         │
│  └── Component tree (AppShell → ...)    │
└─────────────────────────────────────────┘
```

## Module Map — Rust

```
src-tauri/src/
├── lib.rs              — AppState, Tauri builder, command registration
├── main.rs             — Entry point (calls lib::run)
├── terminal_config.rs  — Ghostty/Alacritty/Kitty config detection
├── events.rs           — Event name helpers (pty_exit_event)
├── commands/
│   ├── mod.rs          — Re-exports terminal + workspace
│   ├── terminal.rs     — create/write/resize/kill_session, get_terminal_config
│   └── workspace.rs    — load_persistent_data, save_workspaces, save_settings
├── pty/
│   ├── mod.rs          — Re-exports session, manager, monitor
│   ├── session.rs      — PtySession (spawn, write, resize, kill)
│   ├── manager.rs      — SessionManager (DashMap<String, PtySession>)
│   └── monitor.rs      — Background thread: CWD + git branch polling
└── db/
    ├── mod.rs          — Re-exports storage
    └── storage.rs      — JSON file read/write for workspaces + settings
```

## Module Map — Frontend

```
src/
├── App.tsx                          — Root: preloads config, boots workspace store
├── main.tsx                         — ReactDOM entry
├── global.css                       — CSS variables, xterm overrides, animations
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx             — Main layout: TitleBar + Sidebar + WorkspaceView
│   │   ├── TitleBar.tsx             — 32px custom title bar with drag + window controls
│   │   ├── TabBar.tsx               — Sidebar workspace list with metadata
│   │   ├── TabItem.tsx              — Individual workspace tab in sidebar
│   │   └── NotificationPanel.tsx    — Notification list panel
│   ├── workspace/
│   │   ├── WorkspaceView.tsx        — Active workspace renderer
│   │   ├── TerminalGrid.tsx         — Allotment-based split layout
│   │   ├── TerminalPane.tsx         — Single pane: tab bar + terminal/browser content
│   │   ├── PaneTabBar.tsx           — Per-pane tab strip with split/close controls
│   │   └── PaneHeader.tsx           — Legacy header (replaced by PaneTabBar)
│   ├── terminal/
│   │   └── XTermWrapper.tsx         — xterm.js lifecycle, PTY bridge, WebGL
│   ├── browser/
│   │   └── BrowserPane.tsx          — iframe browser with URL bar
│   ├── setup/
│   │   ├── WorkspaceSetup.tsx       — New workspace wizard
│   │   ├── GridPicker.tsx           — Grid template selector
│   │   ├── GridPreview.tsx          — Visual grid preview
│   │   └── AgentSelector.tsx + AgentSlotList.tsx — Agent assignment
│   └── theme/
│       ├── themeDefinitions.ts      — 9 bundled themes
│       └── ThemeSwitcher.tsx        — Theme picker UI
├── stores/
│   ├── workspaceStore.ts            — Workspaces, panes, tabs, sidebar, pane metadata
│   ├── themeStore.ts                — Active theme + font size
│   └── terminalStore.ts             — Terminal session registry
├── hooks/
│   └── useWorkspacePersist.ts       — Auto-load/save workspaces via Rust IPC
├── lib/
│   ├── ipc.ts                       — Typed wrappers for all Tauri invoke/listen calls
│   ├── constants.ts                 — Layout dimensions, timing, session ID factory
│   ├── agents.ts                    — Built-in agent definitions
│   └── gridTemplates.ts             — Grid template definitions (1x1 → 4x4)
└── types/
    ├── workspace.ts                 — Workspace, Pane, PaneTab, GridTemplateId
    ├── theme.ts                     — ThemeDefinition, TerminalColors
    ├── agent.ts                     — AgentDefinition
    └── index.ts                     — Barrel re-exports
```

## State Ownership

| State | Owner | Persistence |
|-------|-------|-------------|
| Workspace list, active workspace | `workspaceStore` | JSON via `useWorkspacePersist` |
| Pane layout, tabs, split rows | `workspaceStore` | JSON (structure only, not PTY state) |
| Pane metadata (lastLogLine, notifications) | `usePaneMetadataStore` | None (runtime only) |
| Active theme, font size | `themeStore` | JSON via `saveSettings` |
| Terminal sessions | `terminalStore` | None (runtime only) |
| PTY processes | Rust `SessionManager` | None (killed on close) |
| CWD, git branch | Rust `monitor` → store | Polled every 2s |
| Terminal config (font, colors) | Rust `terminal_config` | Cached in JS after first load |
