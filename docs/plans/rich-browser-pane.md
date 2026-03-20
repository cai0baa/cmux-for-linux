# Rich Browser Pane: Tauri v2 Webview Research

**Date**: 2026-03-19
**Status**: Research Complete
**Confidence**: High (0.85) for core API findings; Medium (0.65) for stability of unstable features

---

## Executive Summary

Tauri v2 supports embedding child webviews inside an existing window via `Window::add_child()` with `WebviewBuilder`. This is the correct path for upgrading ptrterminal's BrowserPane from an iframe to a native webview. The feature requires the `unstable` Cargo feature flag and has known positioning/resizing bugs that are actively being worked on. Navigation (back/forward) is NOT natively exposed by Tauri's high-level API and must be implemented via `evaluate_script("history.back()")` calls. The approach is viable but requires careful handling of platform differences and the unstable API surface.

---

## 1. Tauri v2 Webview API: `WebviewBuilder` vs `WebviewWindow`

### Key Types

| Type | Purpose | Use Case |
|------|---------|----------|
| `WebviewWindow` | Combined window + webview (1:1) | Standard app windows, the common pattern |
| `Window` | OS-level window container | Can host multiple child webviews |
| `Webview` | Standalone webview handle | Child webview within a Window |
| `WebviewBuilder` | Builder for creating Webviews | Configures a webview before attaching to a window |
| `WebviewWindowBuilder` | Builder for WebviewWindow | Creates a combined window+webview |

### Embedding a Child Webview

The API for adding a child webview to an existing window:

```rust
// Rust side - in a Tauri command or setup
let window = app.get_window("main").unwrap();

let webview = window.add_child(
    tauri::webview::WebviewBuilder::new(
        "browser-pane",  // unique label
        WebviewUrl::External("https://example.com".parse().unwrap()),
    )
    .auto_resize(),
    LogicalPosition::new(x, y),
    LogicalSize::new(width, height),
)?;
```

### Requirements

- **Cargo.toml**: Must enable the `unstable` feature flag:
  ```toml
  tauri = { version = "2", features = ["unstable"] }
  ```
- The `add_child` method is currently marked as unstable
- Each webview needs a unique string label for identification

### JavaScript Side

From the frontend, you can create webviews using the `@tauri-apps/api/webview` module:

```typescript
import { Webview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';

const window = getCurrentWindow();
const webview = new Webview(window, 'browser-pane', {
  url: 'https://example.com',
  x: 0,
  y: 40,  // leave room for URL bar
  width: 800,
  height: 560,
});
```

---

## 2. Dynamic Positioning and Resizing

### Available Methods

**From JavaScript (`@tauri-apps/api/webview` Webview class)**:
- `setPosition(position: LogicalPosition | PhysicalPosition)` - move the webview
- `setSize(size: LogicalSize | PhysicalSize)` - resize the webview
- `position()` - get current position (returns PhysicalPosition)
- `size()` - get current size (returns PhysicalSize)
- `setAutoResize(autoResize: boolean)` - auto-resize with parent window
- `setZoom(scaleFactor: number)` - set zoom level
- `show()` / `hide()` - toggle visibility

**From Rust (wry level)**:
- `set_bounds(bounds: Rect)` - set position and size
- `bounds()` - get current bounds

### Auto-Resize Behavior

The `.auto_resize()` builder method makes the webview automatically resize proportionally when the parent window resizes. This is useful but has documented bugs:

- **Issue #10131**: After resizing the main window multiple times, webview content stops resizing horizontally (height continues to adjust)
- **Issue #10420**: Broken positioning in the multiwebview example, webviews render stacked vertically instead of in designated positions
- **Issue #11170**: After maximizing and restoring a window, child webview positions do not return to their initial locations

### Recommended Approach for ptrterminal

Since ptrterminal has a dynamic split-pane layout, do NOT rely on `auto_resize()`. Instead:

1. Disable auto-resize
2. Listen for layout changes from the React side
3. Call `setPosition()` and `setSize()` via Tauri commands when the browser pane's container dimensions change
4. Use `ResizeObserver` on the container div to detect size changes

```typescript
// React component approach
useEffect(() => {
  const observer = new ResizeObserver((entries) => {
    const rect = entries[0].contentRect;
    if (webviewRef.current) {
      webviewRef.current.setPosition(new LogicalPosition(rect.x, rect.y));
      webviewRef.current.setSize(new LogicalSize(rect.width, rect.height));
    }
  });
  observer.observe(containerRef.current);
  return () => observer.disconnect();
}, []);
```

### Overlay Positioning Caveat

The native webview renders ABOVE the web content (it is a separate OS-level surface). This means:
- React UI elements (dropdowns, modals, tooltips) CANNOT render on top of the webview
- The URL bar must be positioned OUTSIDE the webview bounds (above it)
- Any overlay UI (loading spinners, error messages) must be implemented as separate webviews or handled differently

---

## 3. Navigation Controls

### What Tauri Provides Natively

| Method | Available? | API |
|--------|-----------|-----|
| Navigate to URL | Yes | `Webview::navigate(url)` (Rust) |
| Get current URL | Yes | `Webview::url()` (Rust), `webview.url()` (JS) |
| Reload | Yes | `wry::WebView::reload()` (wry level) |
| Back | NO | Not exposed in Tauri's high-level API |
| Forward | NO | Not exposed in Tauri's high-level API |
| On Navigation | Yes | `WebviewBuilder::on_navigation(callback)` |

### The Back/Forward Problem

Tauri does NOT expose `go_back()` or `go_forward()` methods at the high-level API. The underlying platform webviews all support it:
- **WebView2** (Windows): `ICoreWebView2::GoBack()`, `GoForward()`, `CanGoBack`
- **WKWebView** (macOS): `goBack()`, `goForward()`, `canGoBack`
- **WebKitGTK** (Linux): `webkit_web_view_go_back()`, `webkit_web_view_go_forward()`

But **wry** (Tauri's webview abstraction layer) does not expose these methods either. wry provides `load_url()`, `reload()`, and `evaluate_script()` but NOT back/forward.

### Workaround: JavaScript Evaluation

Use `evaluate_script` to call browser history APIs:

```rust
// Rust side - Tauri commands
#[tauri::command]
async fn browser_back(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(webview) = app.get_webview("browser-pane") {
        webview.eval("history.back()").map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn browser_forward(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(webview) = app.get_webview("browser-pane") {
        webview.eval("history.forward()").map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn browser_reload(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(webview) = app.get_webview("browser-pane") {
        webview.eval("location.reload()").map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn browser_navigate(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview("browser-pane") {
        webview.navigate(url.parse().map_err(|e: url::ParseError| e.to_string())?);
    }
    Ok(())
}
```

### URL Change Detection

Use the `on_navigation` callback to intercept and track URL changes:

```rust
WebviewBuilder::new("browser-pane", WebviewUrl::External(url))
    .on_navigation(move |url| {
        // Emit URL change event to the main webview
        // Return true to allow navigation, false to block
        println!("Navigating to: {}", url);
        true
    })
```

---

## 4. Cross-Platform Webview Engines

| Platform | Engine | Notes |
|----------|--------|-------|
| **Windows** | WebView2 (Chromium) | Preinstalled on Windows 11; auto-updates; most capable |
| **macOS** | WKWebView (WebKit/Safari) | Tied to OS version; Safari 17+ on Sonoma |
| **Linux** | WebKitGTK (WebKit) | Version varies by distro; Ubuntu 22.04 has webkit2gtk 2.36 |

### Platform-Specific Considerations

**Windows**: Best experience. WebView2 is Chromium-based, supports modern web standards, auto-updates independently of the OS. DevTools available.

**macOS**: Good but tied to OS updates. WKWebView version depends on macOS version. DevTools require calling private APIs (not allowed for App Store submissions). Mixed content handling may differ from Chromium.

**Linux**: Most variable. WebKitGTK version depends on the distribution and package manager. Older distros may have significantly outdated WebKit versions. The `add_child` multiwebview feature is **X11 only** on Linux -- Wayland support for child webviews may be limited or absent.

### Linux/Wayland Warning

The wry documentation states that `WebView::new_as_child` (which backs `add_child`) is "supported on macOS, Windows and Linux (X11 Only)". Since ptrterminal targets Arch Linux (which defaults to Wayland), this is a significant concern. Testing on both X11 and Wayland is essential.

---

## 5. Limitations and Constraints

### CSP (Content Security Policy)
- Tauri injects CSP by default for its own protocol (`tauri://`)
- External URLs loaded in a child webview are NOT subject to Tauri's CSP -- they use their own headers
- You can configure CSP in `tauri.conf.json` under `security.csp` but this primarily affects the main app webview

### Cookie Isolation
- Each webview gets its own cookie jar on some platforms
- Cookies set via JavaScript for `tauri://` protocol URLs are NOT supported
- External URLs in child webviews handle cookies normally through the platform webview engine
- `clearAllBrowsingData()` is available to wipe cookies/cache

### Developer Tools
- Always enabled in debug builds
- Can be enabled in release builds with the `devtools` feature flag
- macOS: Requires private APIs, not App Store compatible if enabled
- Android: DevTools API not supported
- Can be controlled per-webview with `open_devtools()` / `close_devtools()`

### Mixed Content
- Behavior depends on the underlying webview engine
- WebView2 (Windows) follows Chromium mixed content policies
- WKWebView (macOS) and WebKitGTK (Linux) follow Safari/WebKit policies
- Generally: HTTPS pages cannot load HTTP resources without explicit configuration

### Other Limitations
- **No cross-webview DOM access**: Child webviews cannot access the parent webview's DOM and vice versa
- **IPC only through Tauri events**: Communication between webviews uses `emit()` / `listen()` event system
- **Z-ordering**: Native webviews always render on top of web content in the parent webview
- **Input focus**: Only one webview can have focus at a time; focus management between the URL bar (in main webview) and the browser pane (child webview) needs explicit handling

---

## 6. Alternative Approaches

### Option A: Native Child Webview (Recommended)
- Use `Window::add_child()` with `WebviewBuilder`
- Best performance, full browser capabilities
- Limitations: unstable API, z-ordering constraints, Wayland concerns

### Option B: Keep Iframe (Current)
- Simple, works within the existing web context
- Limitations: X-Frame-Options blocks many sites, no devtools for iframe content, sandbox restrictions, cross-origin navigation history inaccessible

### Option C: Separate Window
- Use `WebviewWindowBuilder` to create a separate floating window
- Could be positioned to appear "attached" to the main window
- Limitations: Separate taskbar entry, complex window management, not truly embedded

### Option D: tauri-plugin-opener (External Browser)
- Open URLs in the user's default system browser
- Zero implementation complexity
- Limitations: Not an in-app experience at all

### Option E: Custom wry Integration
- Bypass Tauri's abstraction and use wry directly for the browser webview
- Access to full wry API including `load_url`, `reload`, `set_bounds`
- Limitations: More complex, may conflict with Tauri's webview management

### Recommendation

**Option A (Native Child Webview)** is the right choice for ptrterminal. The iframe approach (Option B) fundamentally cannot work for a real browser experience because most websites block iframe embedding via X-Frame-Options. The unstable API risks are acceptable for a non-App Store desktop application.

---

## 7. Existing Examples and Patterns

### Tauri Official Multiwebview Example

Located at `examples/multiwebview/` in the Tauri repo. Demonstrates:
- Creating 4 child webviews in a 2x2 grid
- Using `auto_resize()` for proportional resizing
- Loading both local (`WebviewUrl::App`) and external (`WebviewUrl::External`) URLs
- Run with: `cargo run --example multiwebview --features unstable`

### Key Pattern from the Example

```rust
let window = tauri::window::WindowBuilder::new(app, "main")
    .inner_size(800., 600.)
    .build()?;

let _webview = window.add_child(
    tauri::webview::WebviewBuilder::new(
        "browser",
        WebviewUrl::External("https://example.com".parse().unwrap()),
    )
    .auto_resize(),
    LogicalPosition::new(0., 0.),
    LogicalSize::new(800., 600.),
)?;
```

---

## 8. Implementation Plan

### Phase 1: Foundation (Rust Backend)

**File: `src-tauri/Cargo.toml`**
```toml
tauri = { version = "2", features = ["unstable"] }
```

**File: `src-tauri/src/browser.rs`** (new module)

Create Tauri commands for browser pane management:

```rust
use tauri::{AppHandle, LogicalPosition, LogicalSize, WebviewUrl};

#[tauri::command]
pub async fn create_browser_pane(
    app: AppHandle,
    label: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let window = app.get_window("main").ok_or("Main window not found")?;
    let parsed_url = url.parse().map_err(|e: url::ParseError| e.to_string())?;

    window.add_child(
        tauri::webview::WebviewBuilder::new(&label, WebviewUrl::External(parsed_url))
            .on_navigation(move |nav_url| {
                // TODO: emit URL change event to frontend
                true
            }),
        LogicalPosition::new(x, y),
        LogicalSize::new(width, height),
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn destroy_browser_pane(app: AppHandle, label: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&label) {
        webview.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn browser_navigate(app: AppHandle, label: String, url: String) -> Result<(), String> {
    let webview = app.get_webview(&label).ok_or("Webview not found")?;
    let parsed = url.parse().map_err(|e: url::ParseError| e.to_string())?;
    webview.navigate(parsed);
    Ok(())
}

#[tauri::command]
pub async fn browser_back(app: AppHandle, label: String) -> Result<(), String> {
    let webview = app.get_webview(&label).ok_or("Webview not found")?;
    webview.eval("history.back()").map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn browser_forward(app: AppHandle, label: String) -> Result<(), String> {
    let webview = app.get_webview(&label).ok_or("Webview not found")?;
    webview.eval("history.forward()").map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn browser_reload(app: AppHandle, label: String) -> Result<(), String> {
    let webview = app.get_webview(&label).ok_or("Webview not found")?;
    webview.eval("location.reload()").map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn browser_resize(
    app: AppHandle,
    label: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let webview = app.get_webview(&label).ok_or("Webview not found")?;
    webview.set_position(LogicalPosition::new(x, y)).map_err(|e| e.to_string())?;
    webview.set_size(LogicalSize::new(width, height)).map_err(|e| e.to_string())?;
    Ok(())
}
```

**File: `src-tauri/src/lib.rs`** - Register commands:
```rust
mod browser;

// In the builder:
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    browser::create_browser_pane,
    browser::destroy_browser_pane,
    browser::browser_navigate,
    browser::browser_back,
    browser::browser_forward,
    browser::browser_reload,
    browser::browser_resize,
])
```

### Phase 2: Frontend Integration

**File: `src/components/browser/BrowserPane.tsx`** (rewrite)

Replace the iframe-based implementation with native webview management:

```typescript
import { memo, useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface BrowserPaneProps {
  sessionId: string;
}

export default memo(function BrowserPane({ sessionId }: BrowserPaneProps) {
  const [inputUrl, setInputUrl] = useState("");
  const [currentUrl, setCurrentUrl] = useState("about:blank");
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const label = `browser-${sessionId}`;

  // Create the native webview on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    invoke("create_browser_pane", {
      label,
      url: "about:blank",
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    }).then(() => setIsLoaded(true));

    return () => {
      invoke("destroy_browser_pane", { label });
    };
  }, [label]);

  // Resize the webview when the container changes size
  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].target.getBoundingClientRect();
      invoke("browser_resize", {
        label,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isLoaded, label]);

  const navigate = useCallback((target: string) => {
    let normalized = target.trim();
    if (normalized && !normalized.startsWith("http://") &&
        !normalized.startsWith("https://") &&
        !normalized.startsWith("about:")) {
      normalized = "https://" + normalized;
    }
    if (normalized && normalized !== "about:blank") {
      invoke("browser_navigate", { label, url: normalized });
      setCurrentUrl(normalized);
      setInputUrl(normalized);
    }
  }, [label]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex",
                  flexDirection: "column", background: "#111" }}>
      {/* URL bar - renders in the main webview, ABOVE the native webview */}
      <div style={{ /* ... URL bar styles ... */ }}>
        <button onClick={() => invoke("browser_back", { label })}>&#8249;</button>
        <button onClick={() => invoke("browser_forward", { label })}>&#8250;</button>
        <button onClick={() => invoke("browser_reload", { label })}>&#8635;</button>
        <input
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && navigate(inputUrl)}
          placeholder="Enter URL..."
        />
      </div>
      {/* Container div - the native webview will be positioned over this area */}
      <div ref={containerRef} style={{ flex: 1, overflow: "hidden" }} />
    </div>
  );
});
```

### Phase 3: Permissions and Configuration

**File: `src-tauri/capabilities/default.json`** - Add webview permissions:
```json
{
  "permissions": [
    "core:webview:allow-create-webview",
    "core:webview:allow-set-webview-position",
    "core:webview:allow-set-webview-size",
    "core:webview:allow-webview-close"
  ]
}
```

### Phase 4: Polish and Edge Cases

1. **Focus management**: Handle focus transitions between URL bar and native webview
2. **URL sync**: Use `on_navigation` callback to emit events when the URL changes within the browser pane, keeping the URL bar in sync
3. **Hide on inactive tab**: Call `webview.hide()` when the browser pane tab is not active, `webview.show()` when selected
4. **DevTools**: Add a keyboard shortcut (F12) to toggle devtools on the browser pane webview
5. **Error handling**: Handle cases where webview creation fails (missing WebView2 on older Windows, etc.)

---

## 9. Known Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| `unstable` feature may break between Tauri releases | Medium | Pin Tauri version, test upgrades |
| Wayland may not support child webviews on Linux | High | Test on Wayland, fallback to iframe if needed |
| Resize bugs (issues #10131, #10420) | Medium | Manual positioning instead of auto_resize |
| No native back/forward API | Low | `evaluate_script("history.back()")` works reliably |
| Z-ordering (webview always on top) | Medium | Keep URL bar outside webview bounds |
| Focus stealing between webviews | Medium | Explicit focus management with click handlers |

---

## Sources

- [Tauri v2 Webview JS API](https://v2.tauri.app/reference/javascript/api/namespacewebview/)
- [Tauri v2 WebviewWindow JS API](https://v2.tauri.app/reference/javascript/api/namespacewebviewwindow/)
- [WebviewBuilder Rust API (docs.rs)](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewBuilder.html)
- [wry WebView API (docs.rs)](https://docs.rs/wry/latest/wry/struct.WebView.html)
- [Tauri Multiwebview Example](https://github.com/tauri-apps/tauri/blob/dev/examples/multiwebview/README.md)
- [Tauri Webview Versions Reference](https://v2.tauri.app/reference/webview-versions/)
- [Issue #10079: Child webview creation](https://github.com/tauri-apps/tauri/issues/10079)
- [Issue #10131: Multiwebview resize bug](https://github.com/tauri-apps/tauri/issues/10131)
- [Issue #10420: Multiwebview positioning bug](https://github.com/tauri-apps/tauri/issues/10420)
- [Issue #11170: Positioning after maximize/restore](https://github.com/tauri-apps/tauri/issues/11170)
- [Issue #13957: canGoBack returns false](https://github.com/tauri-apps/tauri/issues/13957)
- [wry Repository (GitHub)](https://github.com/tauri-apps/wry)
- [Tauri Architecture](https://v2.tauri.app/concept/architecture/)
