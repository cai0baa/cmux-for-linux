# Terminal Core

## xterm.js Setup

Each terminal pane runs an `XTermWrapper` component that manages a full xterm.js lifecycle:

```typescript
new Terminal({
  cursorBlink: true,
  cursorStyle: "block",
  fontSize: 14,              // after config detection + scaling
  fontFamily: "'...'",       // from user's terminal config
  letterSpacing: -1,
  lineHeight: 1.0,
  scrollback: 5000,
  allowTransparency: false,
  smoothScrollDuration: 0,   // instant scroll
  rescaleOverlappingGlyphs: true,
  customGlyphs: true,
});
```

## Addons Loaded

| Addon | Purpose |
|-------|---------|
| `FitAddon` | Auto-resize terminal grid to container dimensions |
| `WebLinksAddon` | Make URLs in terminal output clickable |
| `WebglAddon` | GPU-accelerated rendering (falls back to canvas) |

WebGL addon includes context loss recovery — disposes and falls back on `onContextLoss`.

## PTY Connection

- **Binary streaming**: Tauri `Channel<Vec<u8>>` delivers `ArrayBuffer` directly to JS
- **Reader thread**: OS thread (not tokio), 4KB blocking reads
- **Writer**: `term.onData()` and `term.onBinary()` → `writeToSession()` invoke
- **Environment**: `TERM=xterm-256color`, `COLORTERM=truecolor`, `TERM_PROGRAM=ptrterminal`

## Resize Handling

```
ResizeObserver on container
  → 50ms debounce
    → fitAddon.fit()
      → resizeSession(sessionId, term.cols, term.rows)
        → Rust: master.resize(PtySize)
```

## Process Exit

When the reader thread returns `Ok(0)` or an error:
1. Rust emits `pty-exit-{session_id}` event
2. JS listener writes `[Process exited]` in yellow to terminal
3. Calls `onExit()` callback
4. `TerminalPane` shows "↺ Restart" button overlay
5. Restart increments a `restartKey` which remounts `XTermWrapper` with a fresh PTY

## Config Detection

Terminal font/colors are auto-detected from the user's native terminal config on first load. The config is cached globally — all panes share the same resolved font/theme.

See [config-detection.md](config-detection.md) for detection details.

## Scrollback

- Buffer: 5000 lines
- Smooth scroll: disabled (duration = 0)
- Viewport overflow: hidden (CSS override)

## Performance

- `memo()` wrapping prevents unnecessary re-renders
- Effect only re-runs when `sessionId` changes
- Config loaded once, cached globally
- Log line extraction throttled to 500ms
- All inactive tabs kept mounted but hidden (`display: none`) to preserve PTY state
