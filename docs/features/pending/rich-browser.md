# Rich Browser Pane

## Overview

Upgrade the current iframe-based browser pane to a full embedded browser with profiles, history, DevTools, and automation API.

## Current State

ptrterminal has a basic `BrowserPane.tsx` using an iframe with URL bar. Limitations:
- No navigation history (back/forward)
- No DevTools
- iframe sandbox restrictions block many sites
- No persistent cookies/profiles

## cmux Reference
- Uses `WKWebView` with custom `CmuxWebView` wrapper
- Full address bar with back/forward/refresh controls
- Developer tools panel (WebKit Inspector)
- Popup window support for OAuth flows
- Search engine integration (address bar doubles as search)
- Per-workspace browser profiles with isolated storage

## ptrterminal Requirements

| Layer | What's Needed |
|-------|---------------|
| Rust/Tauri | Use Tauri's `WebviewWindow` or `webview` APIs for real browser context |
| Frontend | `RichBrowserPane.tsx` replacing current iframe approach |
| Frontend | Navigation bar: URL input, back, forward, refresh, loading indicator |
| Frontend | History dropdown, bookmarks |
| IPC | `browser_navigate`, `browser_back`, `browser_forward`, `browser_devtools` |
| Store | Browser state per pane: URL, history stack, loading state |
| Config | Browser profiles with isolated cookie/storage partitions |

## Key Decisions

- **Tauri webview vs iframe**: Tauri webview gives full browser capabilities but requires native window management
- **DevTools**: Tauri webview supports `open_devtools()` — expose via keyboard shortcut
- **Isolation**: Each browser pane gets unique partition for cookie isolation

## Priority: **Medium**

Current iframe browser works for basic use. Rich browser enables developer workflow integration (docs, dashboards alongside terminals).
