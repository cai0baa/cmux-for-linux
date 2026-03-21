# Application Architecture — BridgeSpace v2.2.2

## Overview

BridgeSpace is a Tauri v2 desktop application. The Rust backend manages PTY sessions, WebView
embedding, a local HTTP/WebSocket service on port 7242, and file I/O. The React frontend runs
inside the Tauri WebView and communicates via Tauri IPC commands and the Channel API.

## Tauri Plugin List

Confirmed from binary strings (plugin names follow `tauri-plugin-*` convention):

| Plugin | Purpose |
|--------|---------|
| `shell` | Run shell commands, PTY sessions |
| `http` | HTTP client from frontend |
| `dialog` | Native file/folder dialogs |
| `updater` | Auto-update from GitHub releases |
| `deep-link` | OAuth callback via custom URL scheme |
| `single-instance` | Prevents duplicate app windows |
| `tray` | System tray icon + menu |
| `webview` | Additional WebView control beyond main window |

## IPC Patterns

- **Command IPC**: Standard Tauri `invoke()` pattern — frontend calls Rust handlers
- **Channel API**: Uses `__CHANNEL__` prefix (Tauri v2 streaming/event channel pattern)
  - Used for real-time PTY output streaming to frontend
  - Used for agent status event streaming from port 7242 service

## Local Coordination Service (Port 7242)

A local HTTP + WebSocket server embedded in the Tauri backend:
- **REST endpoints**: Agent task queue, status polling, workspace state
- **WebSocket**: Real-time event stream for agent status updates
- **CSP allowlist**: `http://127.0.0.1:7242` explicitly allowed in Content Security Policy
- Only accessible to localhost — not exposed externally

## Shell Integration

| Item | Value |
|------|-------|
| Environment variable | `BRIDGESPACE_SHELL_INTEGRATION=1` |
| Protocol | OSC 133 sequences (mark shell prompt, command start/end) |
| Purpose | Detect shell prompts, parse command output boundaries |

This is the same OSC 133 integration used by Warp, iTerm2, and modern terminals.

## Multi-Window / Multi-Agent Layout

- **Workspaces**: Named groups of panes (inferred from UI bundle names)
- **Panes**: Individual terminal sessions, each with its own PTY
- **Tabs**: Per-pane tab bar for switching between terminal / browser / editor views
- **Swarm overlay**: Additional UI mode that shows agent coordination dashboard

## Build Path Artifact

Found in macOS binary strings:
```
/Users/runner/work/bridgespace-tauri/bridgespace-tauri/
```
Confirms GitHub Actions macOS runner for CI/CD builds. Repository is likely named
`bridgespace-tauri` (private).

## External Service Endpoints

| Endpoint | Purpose |
|----------|---------|
| `https://api.bridgemind.ai` | Backend API (auth, sync, billing) |
| `https://app.bridgemind.ai` | Web app (OAuth redirect, account management) |

## Content Security Policy

Extracted from binary (CSP header injected into WebView):
```
http://127.0.0.1:7242        ← local coordination service
https://api.bridgemind.ai    ← backend API
https://app.bridgemind.ai    ← web app / OAuth
```
All other external origins blocked by default.
