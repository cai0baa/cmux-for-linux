# Changelog

All notable changes to ptrterminal are documented here.

---

## [0.1.3] — 2026-03-20

### Added: Native Browser Pane via wry/WebKit2GTK

#### What changed

Replaced the `<iframe>`-based browser pane with a native wry child webview embedded directly in the GTK window. Each browser tab now gets a real WebKit2GTK webview instance, fully capable of loading any website regardless of `X-Frame-Options` or cross-origin restrictions.

#### Why

The iframe approach was fundamentally limited:
- Most real websites (`google.com`, `github.com`, etc.) set `X-Frame-Options: DENY` or `Content-Security-Policy: frame-ancestors 'none'`, causing blank panes.
- JavaScript execution from the host was blocked by same-origin policy — the agent could not automate iframe content.
- History navigation (`back`/`forward`) silently failed on cross-origin navigations.

The native webview approach resolves all of these by running WebKit as a child X11 window positioned inside the GTK layout, with privileged JavaScript execution from the Rust host process.

#### GTK window restructuring (`src-tauri/src/lib.rs`)

On Linux, the GTK window hierarchy is restructured at startup:

```
Before:
  GtkApplicationWindow → GtkBox (vbox) → WebKitWebView (React UI)

After:
  GtkApplicationWindow → GtkOverlay → GtkBox (vbox) → WebKitWebView (React UI)
                                    ↘ GtkFixed (floating layer for browser panes)
```

A `gtk::Overlay` wraps the existing vbox so a `gtk::Fixed` container can float on top without displacing the React UI. The Fixed is used because wry's `build_gtk()` only supports absolute positioning when the container is a `GtkFixed` — with a `GtkBox` it ignores bounds entirely and fills the box.

`overlay.set_overlay_pass_through(&fixed, true)` is applied to the Fixed so GTK routes input events through it to the React UI in areas where no browser child window is present. Without this, the Fixed intercepts all clicks and keypresses everywhere, breaking the entire app.

#### BrowserManager (`src-tauri/src/commands/browser.rs`)

New Tauri state struct managing all active browser panes:

```rust
pub struct BrowserManager {
    panes: DashMap<String, BrowserPane>,
    fixed: gtk::Fixed,
}
```

`DashMap` provides lock-free concurrent access. `Send + Sync` are manually declared because GTK types don't implement them — all GTK calls are safe because they occur on the GTK main thread.

New Tauri commands exposed:
- `browser_create(session_id, x, y, w, h)` — create and position a webview
- `browser_destroy(session_id)` — destroy a webview and free its resources
- `browser_set_bounds(session_id, x, y, w, h)` — reposition/resize
- `browser_navigate(session_id, url)` — load a URL
- `browser_eval(session_id, script)` — execute JavaScript, return result
- `browser_status(session_id)` — check if a session exists
- `browser_snapshot(session_id)` — return DOM text content for agent inspection

#### BrowserPane component (`src/components/browser/BrowserPane.tsx`)

Rewritten to manage the webview lifecycle:
- Calls `browser_create` on mount with the container element's `getBoundingClientRect()` coordinates.
- Installs a `ResizeObserver` to call `browser_set_bounds` when the pane is resized.
- Calls `browser_destroy` on unmount.
- URL bar normalizes input (auto-prepends `https://`) and calls `browser_navigate`.

#### Socket API — new browser automation commands (`src/components/layout/SocketListener.tsx`)

New commands available to external agents via the Unix socket:

| Command | Description |
|---------|-------------|
| `browser.navigate` | Navigate the browser pane to a URL |
| `browser.eval` | Execute arbitrary JavaScript, return result |
| `browser.snapshot` | Get a DOM text snapshot for reading page content |
| `browser.status` | Check whether a browser session is alive |
| `browser.click` | Click a CSS selector (injected via `browser_eval`) |
| `browser.fill` | Fill an input field with text (injected via `browser_eval`) |
| `browser.wait` | Poll until a condition is met (load, selector, URL, text) |

`browser.click` and `browser.fill` dispatch native DOM events (`MouseEvent`, `Event('input')`, `Event('change')`) so the page receives them as real user interactions, not synthetic attribute writes.

`browser.wait` polls `browser_eval` in 200ms intervals up to a configurable timeout.

Removed commands that depended on the old iframe API: `browser.back`, `browser.forward`, `browser.reload`, `browser.screenshot`.

#### Dependencies added

```toml
[target.'cfg(target_os = "linux")'.dependencies]
wry = { version = "0.54" }
webkit2gtk = { version = "2.0" }
gtk = { version = "0.18" }
```

These are Linux-only; non-Linux builds are unaffected.

---

## [0.1.2] — 2026-03-18

### Added

- Browser keybindings relay: keydown events inside the browser pane are forwarded to the parent window so global shortcuts (workspace switch, pane split) continue to work while the browser is focused.
- Pane close focus fix: closing a pane now moves focus to the next available pane rather than losing focus entirely.
- Browser agent API: initial socket commands for browser control (`browser.navigate`, `browser.back`, `browser.forward`, `browser.reload`, `browser.eval`, `browser.screenshot`, `browser.status`).

---

## [0.1.1] — 2026-03-17

### Fixed

- Pane split preserves PTY session context: splitting a terminal pane no longer resets the shell session ID, preventing duplicate session creation.

---

## [0.1.0] — 2026-03-15

Initial release.

- Multi-workspace terminal multiplexer built on Tauri + xterm.js
- Pane splitting (horizontal/vertical), drag-to-resize
- Workspace persistence across sessions
- Theme system (auto-detects Ghostty/Alacritty/Kitty config)
- Notification system
- Unix socket API for external control
- Custom title bar with workspace display
