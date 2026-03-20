# SSH Remote Sessions

## Overview

Native SSH connection management with session persistence, reconnection, and port forwarding — replacing the need for external SSH clients.

## cmux Reference
- SSH sessions managed as first-class Surface type alongside local terminals
- Connection profiles stored in config with host, port, key, user
- Automatic reconnection on network recovery
- Port forwarding UI for managing tunnels
- Session multiplexing over single connection (SSH ControlMaster equivalent)

## ptrterminal Requirements

| Layer | What's Needed |
|-------|---------------|
| Rust | `src-tauri/src/ssh/` module — connection manager using `russh` or `ssh2` crate |
| Rust | SSH session struct: host, port, auth method, PTY channel |
| IPC | `ssh_connect`, `ssh_disconnect`, `ssh_list_sessions`, `ssh_port_forward` commands |
| Frontend | `SSHConnectionDialog.tsx` — host/port/key form |
| Frontend | SSH indicator in `PaneTabBar` showing connection status |
| Store | SSH session state in workspace store (connection per pane) |
| Config | SSH profiles in persisted JSON alongside workspace data |

## Key Decisions

- **PTY routing**: SSH PTY channel feeds into same xterm.js pipeline as local PTY
- **Auth**: Support key-based (default) and password auth; agent forwarding optional
- **Reconnect**: Exponential backoff with user-visible status indicator

## Priority: **Low**

Most users have standalone SSH tools. Valuable for all-in-one workflow but significant implementation effort.
