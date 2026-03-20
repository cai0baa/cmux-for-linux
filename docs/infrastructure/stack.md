# Tech Stack

## Core Platform

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Desktop shell | Tauri | 2.x | Lightweight native wrapper; Rust backend + webview frontend |
| Frontend | React | 19.x | Component model, hooks, concurrent features |
| State | Zustand | 5.x | Minimal boilerplate, direct store access outside React |
| Terminal | xterm.js | 5.5.x | Industry-standard terminal emulator for web |
| Language (FE) | TypeScript | 5.7.x | Type safety across components, stores, IPC |
| Language (BE) | Rust | 2021 edition | Memory safety, PTY management, native performance |

## Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@tauri-apps/api` | ^2 | IPC invoke/channel/event bridge to Rust |
| `@xterm/xterm` | ^5.5.0 | Terminal emulator core |
| `@xterm/addon-fit` | ^0.10.0 | Auto-resize terminal to container |
| `@xterm/addon-web-links` | ^0.11.0 | Clickable URLs in terminal output |
| `@xterm/addon-webgl` | ^0.18.0 | GPU-accelerated rendering |
| `allotment` | ^1.0.9 | Resizable split pane layout (Allotment component) |
| `ghostty-web` | ^0.4.0 | Ghostty terminal integration (unused currently) |
| `uuid` | ^11.1.0 | UUID generation for sessions, panes, workspaces |
| `zustand` | ^5.0.0 | State management |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@tauri-apps/cli` | ^2 | `tauri dev` / `tauri build` commands |
| `@vitejs/plugin-react` | ^4.3.0 | React Fast Refresh + JSX transform |
| `vite` | ^6.0.0 | Dev server + bundler |
| `typescript` | ^5.7.0 | Type checking |

## Rust Dependencies

| Crate | Version | Purpose |
|-------|---------|---------|
| `tauri` | 2 | Application framework, IPC, window management |
| `tauri-plugin-shell` | 2 | Shell command execution |
| `serde` / `serde_json` | 1 | Serialization for IPC and persistence |
| `portable-pty` | 0.8 | Cross-platform PTY creation and management |
| `dashmap` | 6 | Concurrent HashMap for session storage |
| `tokio` | 1 (full) | Async runtime for Tauri |

## Build Chain

```
TypeScript → Vite (dev server :1420) → Tauri webview
Rust       → cargo (via tauri-build) → native binary
```
