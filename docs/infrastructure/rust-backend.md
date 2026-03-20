# Rust Backend

## Tauri Commands

All commands registered in `lib.rs` via `tauri::generate_handler![]`.

### Terminal Commands (`commands/terminal.rs`)

| Command | Signature | Description |
|---------|-----------|-------------|
| `create_session` | `(session_id, command, args, cols, rows, on_data: Channel<Vec<u8>>)` | Spawn PTY process, start reader thread, stream output via Channel |
| `write_to_session` | `(session_id, data: String)` | Write UTF-8 string to PTY master |
| `resize_session` | `(session_id, cols, rows)` | Resize PTY to new dimensions |
| `kill_session` | `(session_id)` | Kill child process, remove from manager |
| `get_terminal_config` | `() → TerminalConfigPayload` | Detect user's terminal font/colors |

### Workspace Commands (`commands/workspace.rs`)

| Command | Signature | Description |
|---------|-----------|-------------|
| `load_persistent_data` | `() → PersistentData` | Load workspaces + settings from JSON |
| `save_workspaces` | `(workspaces: Vec<WorkspaceConfig>)` | Merge workspace configs into JSON |
| `save_settings` | `(settings: AppSettings)` | Merge app settings into JSON |

## Key Types

### `PtySession` (`pty/session.rs`)

```rust
pub struct PtySession {
    child: Mutex<Box<dyn Child + Send + Sync>>,
    master: Mutex<Box<dyn MasterPty + Send>>,
    writer: Mutex<Box<dyn Write + Send>>,
}
```

Methods: `spawn()`, `write()`, `resize()`, `kill()`, `process_id()`

- Sets `TERM=xterm-256color`, `COLORTERM=truecolor`, `TERM_PROGRAM=ptrterminal`
- Reader thread: blocking `read()` in 4KB chunks, sends via `Channel<Vec<u8>>`
- Emits `pty-exit-{session_id}` event when reader exits

### `SessionManager` (`pty/manager.rs`)

```rust
pub struct SessionManager {
    sessions: DashMap<String, PtySession>,
}
```

Methods: `create()`, `write()`, `resize()`, `kill()`, `kill_all_for_workspace()`, `iter_pids()`

- Thread-safe via `DashMap` — no global lock contention
- `kill_all_for_workspace()` matches sessions by key prefix

### `PtyMetadata` (`pty/monitor.rs`)

```rust
pub struct PtyMetadata {
    pub session_id: String,
    pub cwd: String,
    pub git_branch: Option<String>,
}
```

Monitor thread: polls every 2s, reads `/proc/{pid}/cwd`, runs `git rev-parse` on CWD change, emits `pty_metadata` event.

### `TerminalUserConfig` (`terminal_config.rs`)

```rust
pub struct TerminalUserConfig {
    pub font_family: String,
    pub font_size: f32,
    pub colors: UserColors,
}

pub struct UserColors {
    pub background: [u8; 3],
    pub foreground: [u8; 3],
    pub ansi: [[u8; 3]; 16],
}
```

Detection order: ghostty → alacritty → kitty → system defaults.
Merges font from best available, colors from first with explicit palette.

### Persistence Types (`db/storage.rs`)

```rust
pub struct PersistentData {
    pub workspaces: Vec<WorkspaceConfig>,
    pub settings: AppSettings,
}

pub struct WorkspaceConfig {
    pub id: String,
    pub name: String,
    pub grid_template_id: String,
    pub panes: Vec<PaneConfig>,
    pub created_at: u64,
}

pub struct AppSettings {
    pub font_size: u16,     // default: 14
    pub theme_id: String,   // default: "catppuccin-mocha"
}
```

Storage location: `$APP_DATA_DIR/data.json` (Tauri's `app_data_dir()`).

## Events

| Event | Payload | Emitter |
|-------|---------|---------|
| `pty-exit-{session_id}` | `()` | Reader thread on EOF/error |
| `pty_metadata` | `PtyMetadata` | Monitor thread on CWD/branch change |
