# Socket API & Automation

## Overview

Unix domain socket exposing a JSON-RPC API for external control, plus a CLI tool (`ptr`) for scripting terminal operations.

## cmux Reference
- Unix socket at `~/.cmux/cmux.sock`
- **60+ commands** across categories:
  - **Window**: new, close, minimize, fullscreen, geometry
  - **Workspace**: new, close, select, rename, reorder, list
  - **Surface**: new (terminal/browser/markdown), close, focus, split, zoom
  - **Notification**: send, clear, list, mark-read
  - **Status**: set/get per-pane status text, Git branch display
  - **Port monitoring**: scan, list, open in browser
- CLI wrapper: `cmux <command> [args]` translates to socket messages
- JSON request/response protocol with streaming for output

## ptrterminal Requirements

| Layer | What's Needed |
|-------|---------------|
| Rust | `src-tauri/src/socket/` module — Unix socket listener |
| Rust | JSON-RPC message parser and dispatcher |
| Rust | Command handlers mapped to existing Tauri command logic |
| CLI | `ptr` binary (separate Rust crate or shell script wrapping `socat`) |
| Protocol | JSON messages: `{"cmd": "workspace.new", "args": {...}}` |

## Suggested Command Set (Phase 1)

```
workspace.list    workspace.new     workspace.select
workspace.close   workspace.rename
pane.split-right  pane.split-down   pane.close
pane.focus        pane.write        pane.list
notify.send       notify.clear
theme.set         theme.list
```

## Key Decisions

- **Socket path**: `~/.ptrterminal/ptr.sock` or `$XDG_RUNTIME_DIR/ptr.sock`
- **Protocol**: Simple JSON-RPC 2.0 over Unix socket
- **Auth**: No auth needed — socket permissions provide access control
- **Streaming**: Optional for `pane.output` command (subscribe to PTY output)

## Priority: **Medium**

Enables scripting, agent integration, and external tool control. High value for power users and AI agent workflows.
