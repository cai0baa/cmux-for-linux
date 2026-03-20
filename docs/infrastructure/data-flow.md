# Data Flow

## Terminal Output (PTY → Screen)

```
PTY child process
  → reader thread (4KB buffer, blocking read)
    → Channel<Vec<u8>>.send(raw_bytes)
      → JS Channel.onmessage(ArrayBuffer)
        → term.write(new Uint8Array(data))
          → WebGL renderer draws glyphs
```

- **Binary streaming**: Raw bytes via Tauri `Channel` API — no base64 encoding
- **Buffer size**: 4096 bytes per read (matches OS page size)
- **Thread**: Dedicated OS thread per session (not tokio), blocking I/O

## Terminal Input (Keyboard → PTY)

```
User keystroke
  → xterm.js onData(string) / onBinary(string)
    → writeToSession(sessionId, data) [invoke]
      → Rust: session.writer.write_all(bytes)
        → PTY master fd → child process stdin
```

- **Custom key handling**: `attachCustomKeyEventHandler` intercepts Shift+Enter before xterm processes it, sends `\x1b[13;2u` (kitty protocol)

## Terminal Resize

```
Container ResizeObserver fires
  → 50ms debounce
    → fitAddon.fit() (recalculates cols/rows)
      → resizeSession(sessionId, cols, rows) [invoke]
        → Rust: master.resize(PtySize { rows, cols })
```

## PTY Exit

```
Reader thread returns Ok(0) or Err
  → Emitter::emit("pty-exit-{session_id}")
    → JS listen callback
      → term.writeln("[Process exited]")
        → onExit() callback
          → TerminalPane shows "↺ Restart" button
```

## Session Creation

```
TerminalPane mounts
  → XTermWrapper useEffect(sessionId)
    → ensureConfigLoaded() (cached globally)
    → new Terminal({ font, theme, scrollback: 5000 })
    → loadAddon(FitAddon, WebLinksAddon, WebglAddon)
    → onPtyExit listener registered
    → fitAddon.fit() → cols, rows
    → createSession(sessionId, command, args, cols, rows, channelCallback) [invoke]
      → Rust: PtySession::spawn()
        → native_pty_system().openpty(size)
        → CommandBuilder::new(command).env("TERM", "xterm-256color")
        → pair.slave.spawn_command(cmd)
        → reader thread spawned
```

## Workspace Persistence

```
Save (on every workspace store change):
  workspaceStore.subscribe()
    → toConfig(ws) for each workspace
      → saveWorkspaces(configs) [invoke]
        → Rust: storage::load() → mutate → storage::save()
          → write to $APP_DATA_DIR/data.json

Load (on mount):
  useWorkspacePersist hook
    → loadPersistentData() [invoke]
      → Rust: storage::load()
        → read $APP_DATA_DIR/data.json
          → deserialize PersistentData
    → createWorkspace() for each config
    → removeWorkspace(bootstrap) to replace initial workspace
```

## Pane Metadata Polling

```
Rust monitor thread (2s interval):
  → iter_pids() from SessionManager
    → for each (session_id, pid):
      → readlink("/proc/{pid}/cwd") [Linux]
        → if CWD changed: git rev-parse --abbrev-ref HEAD
          → emit("pty_metadata", { session_id, cwd, git_branch })

JS listener (App.tsx):
  → onPtyMetadata(callback)
    → workspaceStore.updatePaneMetadata(session_id, { cwd, gitBranch })
```

## Notification Flow

```
xterm.js term.onWriteParsed()
  → 500ms throttle
    → extract last non-empty line from buffer
      → if changed && pane not active:
        → paneMetadataStore.incrementNotification(sessionId)
        → paneMetadataStore.setMetadata(sessionId, { lastLogLine })
          → TabBar re-renders with badge count
          → PaneTabBar shows notification dot

Flash (Ctrl+Shift+H):
  → triggerFlash(paneId)
    → flashingPaneIds.add(paneId)
      → TerminalPane renders flash overlay (0.9s animation)
    → setTimeout 900ms → flashingPaneIds.delete(paneId)
```
