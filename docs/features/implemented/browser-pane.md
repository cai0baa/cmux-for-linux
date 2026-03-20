# Browser Pane

## Overview

An embedded browser using a native wry/WebKit2GTK child webview (Linux). Each browser tab gets its own webview instance, positioned over the Tauri main window using a `gtk::Fixed` overlay container. This replaces the earlier `<iframe>` implementation, which was blocked by cross-origin restrictions and `X-Frame-Options` headers on most real websites.

## Architecture

### GTK Overlay Setup (`src-tauri/src/lib.rs`)

On startup, the app restructures the GTK window hierarchy to support floating child webviews:

```
GtkApplicationWindow
  └── GtkOverlay
        ├── GtkBox (vbox)         ← Tauri's main webview lives here
        │     └── WebKitWebView   ← The React UI
        └── GtkFixed              ← Floating layer for browser child webviews
              └── WebKitWebView   ← Each browser pane (positioned absolutely)
```

The `gtk::Overlay` widget lets the `Fixed` float on top of the vbox without displacing it. `set_overlay_pass_through(&fixed, true)` is critical — without it, the Fixed layer intercepts all mouse and keyboard events even in empty areas, breaking the entire UI.

### Why `gtk::Fixed` + `gtk::Overlay`

- wry's `build_gtk(container)` only supports absolute positioning when the container is a `gtk::Fixed`. With a `GtkBox`, it calls `pack_start()` and ignores position/size entirely.
- Wrapping with `gtk::Overlay` lets the Fixed float above the React UI without pushing it down, so both layers coexist.
- `set_overlay_pass_through` tells GTK to route input events through the Fixed to the React UI in areas where no child webview is active.

### BrowserManager (`src-tauri/src/commands/browser.rs`)

A `tauri::State`-managed struct holding all active browser panes:

```rust
pub struct BrowserManager {
    panes: DashMap<String, BrowserPane>,  // session_id → webview
    fixed: gtk::Fixed,                    // the overlay container
}
```

`DashMap` provides concurrent access. `Send + Sync` are manually implemented because wry/GTK types don't implement them automatically, but all GTK calls happen on the main thread.

## Tauri Commands

| Command | Args | Description |
|---------|------|-------------|
| `browser_create` | `session_id, x, y, w, h` | Create a new webview at given bounds |
| `browser_destroy` | `session_id` | Remove and destroy a webview |
| `browser_set_bounds` | `session_id, x, y, w, h` | Reposition/resize an existing webview |
| `browser_navigate` | `session_id, url` | Load a URL in the webview |
| `browser_eval` | `session_id, script` | Execute JavaScript and return result |
| `browser_status` | `session_id` | Check if a session exists |
| `browser_snapshot` | `session_id` | Return an accessibility/DOM text snapshot |

Coordinates are logical pixels from `getBoundingClientRect()` in the React UI, which aligns with the overlay's coordinate space.

## Component: `BrowserPane.tsx`

Manages the lifecycle of a webview for a single pane tab.

- **Mount**: Calls `browser_create` with the container div's bounding rect. Starts a `ResizeObserver` to call `browser_set_bounds` whenever the pane is resized or the layout changes.
- **Unmount**: Calls `browser_destroy` to free the webview.
- **URL bar**: Normalizes input (prepends `https://` if no protocol), calls `browser_navigate`.
- **Loading state**: Visual spinner while navigation is in progress.

```
┌──────────────────────────────────────┐
│ ‹  ›  [ https://example.com     ] ↻ │  ← React URL bar (in Tauri webview)
├──────────────────────────────────────┤
│                                      │
│   Native WebKit webview here         │  ← wry child webview (GTK Fixed layer)
│                                      │
└──────────────────────────────────────┘
```

The URL bar is rendered by React inside the Tauri webview. The browser content area is a native WebKit child window positioned directly beneath it.

## Socket API — Browser Commands

All browser commands are available via the Unix socket (for AI agent use):

| Command | Args | Description |
|---------|------|-------------|
| `browser.navigate` | `url`, `pane_id?` | Navigate to URL |
| `browser.eval` | `script`, `pane_id?` | Run JavaScript, return result |
| `browser.snapshot` | `pane_id?` | Get DOM text snapshot |
| `browser.status` | `pane_id?` | Check if pane is alive |
| `browser.click` | `selector`, `pane_id?` | Click a CSS selector |
| `browser.fill` | `selector`, `text`, `pane_id?` | Fill an input field |
| `browser.wait` | `for`, `timeout?`, `selector?`, `text?`, `pane_id?` | Wait for condition |

`browser.click` and `browser.fill` are implemented via `browser_eval` with injected JavaScript using native DOM events (`MouseEvent`, `Event('input')`). `browser.wait` polls `browser_eval` in 200ms intervals up to the timeout.

`pane_id` defaults to the first browser tab in the active workspace when omitted.

## Coordinate System

React's `getBoundingClientRect()` returns logical CSS pixels relative to the Tauri webview origin (top-left = 0,0). The `gtk::Fixed` overlay covers the same area as the main window, so coordinates map directly without any conversion.

## How to Open

1. Click the globe icon (🌐) in any pane's tab bar → creates a `type: "browser"` tab
2. The pane renders `BrowserPane`, which calls `browser_create` on mount

## Capabilities vs. Iframe

| Feature | iframe (old) | Native webview (current) |
|---------|-------------|--------------------------|
| Cross-origin sites | ❌ blocked by X-Frame-Options | ✅ full access |
| JavaScript execution | ❌ blocked by same-origin policy | ✅ privileged host-side eval |
| Real navigation history | ❌ | ✅ |
| Cookie/session persistence | ❌ | ✅ (per-session WebKit data store) |
| Agent automation | limited | ✅ click, fill, eval, snapshot |
