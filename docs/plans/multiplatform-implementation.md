# Multiplatform Implementation Plan — Windows, macOS, Linux

**Date**: 2026-03-21
**Status**: In Progress (Phases 1, 4, 5, 6 Complete)
**Estimated Effort**: 5-7 days (3-4 remaining)

---

## Executive Summary

This plan details how to extend ptrterminal (CMux Linux) from Linux-only to full Windows/macOS support, with native browser pane embedding on all three platforms. The approach follows BridgeSpace's proven architecture: **Tauri v2 + wry cross-platform WebView abstraction**.

### Key Decisions
- **Stay on Tauri** (not Electron) — smaller binary, lower memory, same stack as BridgeSpace
- **Use wry native embedding** — not tauri-plugin-webview, gives full control over WebView placement
- **Replace Unix socket with TCP** — works on all platforms without named pipe complexity
- **PowerShell as Windows default** — modern Windows terminal experience

---

## Current State Analysis

### What's Already Cross-Platform (Zero Changes)
| Component | Status | Notes |
|-----------|--------|-------|
| Frontend (React/TypeScript) | Ready | Served from Tauri, no platform deps |
| PTY via `portable-pty` | Ready | Uses ConPTY on Windows internally |
| State management (Zustand) | Ready | Pure JS |
| xterm.js terminal | Ready | Pure JS |
| Workspace persistence | Ready | File I/O only |

### What Needs Platform Work
| Component | Linux (Current) | macOS (Needed) | Windows (Needed) |
|-----------|-----------------|----------------|------------------|
| Browser pane | GTK Overlay + webkit2gtk | NSView + WKWebView | HWND + WebView2 |
| GTK init in `lib.rs` | `gtk::init()` | Remove | Remove |
| Socket API | Unix socket | TCP | TCP |
| Shell detection | `$SHELL` → bash | `$SHELL` → zsh | `%ComSpec%` → PowerShell |
| Font detection | fc-match | system default | system default |
| Build targets | .deb, .AppImage | .dmg | NSIS .exe, .msi |

---

## Phase 1: Platform Abstraction Layer

**Goal**: Create compile-time platform switching without breaking Linux.
**Duration**: 1-2 days

### 1.1 Refactor BrowserManager into Platform Modules

**Current structure**:
```
browser.rs (424 lines) — monolithic with #[cfg] scattered throughout
```

**Target structure**:
```
src-tauri/src/
├── browser/
│   ├── mod.rs           # Platform-agnostic trait + re-exports
│   ├── linux.rs         # GTK + webkit2gtk implementation
│   ├── macos.rs         # Cocoa + WKWebView implementation (stub initially)
│   └── windows.rs       # Win32 + WebView2 implementation (stub initially)
└── commands/
    └── browser.rs       # Tauri commands (thin wrapper calling browser::*)
```

**Key abstraction** (`browser/mod.rs`):
```rust
pub trait BrowserBackend: Send + Sync {
    fn create(&self, session_id: &str, x: f64, y: f64, w: f64, h: f64) -> Result<(), String>;
    fn destroy(&self, session_id: &str) -> Result<(), String>;
    fn set_bounds(&self, session_id: &str, x: f64, y: f64, w: f64, h: f64) -> Result<(), String>;
    fn navigate(&self, session_id: &str, url: &str) -> Result<(), String>;
    fn eval(&self, session_id: &str, script: &str) -> Result<serde_json::Value, String>;
}
```

### 1.2-1.4 Details

- Extract GTK code to `browser/linux.rs`
- Create stub implementations for macOS/Windows (return errors initially)
- Update `lib.rs` to dispatch platform-specific initialization

**Risk**: GTK objects are not `Send + Sync`. Keep existing `unsafe impl` pattern but isolate in `linux.rs`.

---

## Phase 2: macOS Browser Implementation

**Goal**: Native WKWebView embedding using wry.
**Duration**: 1-2 days

### Key API
```rust
// wry macOS: build_ns_view() returns (webview_nsview, controller)
let webview = WebViewBuilder::new()
    .with_bounds(...)
    .with_url("about:blank")
    .build_ns_view()?;

// Add to parent NSView hierarchy using objc2
```

### Cargo.toml macOS Dependencies
```toml
[target.'cfg(target_os = "macos")'.dependencies]
wry = { version = "0.54" }
objc2 = "0.6"
objc2-app-kit = { version = "0.3", features = ["NSView", "NSWindow"] }
objc2-foundation = "0.3"
raw-window-handle = "0.6"
```

### macOS Risks
| Risk | Mitigation |
|------|------------|
| Thread safety (main thread only) | Use `MainThreadMarker` from objc2 |
| Coordinate system (Y-axis flipped) | Convert: `y = parent_height - y - h` |
| Memory management (ARC) | Use `Id<T>` wrappers |

---

## Phase 3: Windows Browser Implementation

**Goal**: Native WebView2 embedding using wry.
**Duration**: 1-2 days

### Key API
```rust
// wry Windows: build_as_child(hwnd)
let webview = WebViewBuilder::new()
    .with_bounds(...)
    .with_url("about:blank")
    .build_as_child(&hwnd)?;
```

### Cargo.toml Windows Dependencies
```toml
[target.'cfg(target_os = "windows")'.dependencies]
wry = { version = "0.54" }
windows = { version = "0.58", features = [
    "Win32_Foundation",
    "Win32_UI_WindowsAndMessaging"
]}
raw-window-handle = "0.6"
```

### Windows Risks
| Risk | Mitigation |
|------|------------|
| WebView2 runtime missing | Use `webviewInstallMode: downloadBootstrapper` |
| DPI scaling | Use logical coordinates, let wry handle |

---

## Phase 4: Shell & Terminal Cross-Platform

**Goal**: PTY sessions work correctly on all platforms.
**Duration**: 0.5-1 day

### Shell Detection Logic
```rust
pub fn detect_shell() -> (String, Vec<String>) {
    #[cfg(unix)]
    {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into());
        (shell, vec![])
    }
    
    #[cfg(windows)]
    {
        // Prefer pwsh > powershell > cmd.exe
        if which::which("pwsh").is_ok() {
            return ("pwsh".into(), vec!["-NoLogo".into()]);
        }
        // ... fallback logic
    }
}
```

### portable-pty Notes
- **Already supports Windows** via ConPTY
- Stick with version **0.8.x** (0.9.0 has known Windows issues)
- Requires Windows 10 October 2018 (1809) or newer

---

## Phase 5: Socket API Cross-Platform

**Goal**: Replace Unix socket with TCP.
**Duration**: 0.5 day

### Migration
```rust
// Before
use tokio::net::{UnixListener, UnixStream};
let listener = UnixListener::bind(&socket_path)?;

// After
use tokio::net::{TcpListener, TcpStream};
let listener = TcpListener::bind("127.0.0.1:7343").await?;
```

**Why TCP**: Unix sockets don't exist on Windows. TCP on localhost is simple and works everywhere (BridgeSpace uses port 7242).

---

## Phase 6: Build Configuration

**Goal**: Configure Tauri for all three platform builds.
**Duration**: 1 day

### tauri.conf.json Bundle Targets
```json
{
  "bundle": {
    "targets": "all",
    "linux": { "deb": {...}, "appimage": {...} },
    "macOS": { "dmg": {...}, "minimumSystemVersion": "10.15" },
    "windows": { 
      "nsis": { "installMode": "currentUser" },
      "webviewInstallMode": { "type": "downloadBootstrapper" }
    }
  }
}
```

### Required Icons
- `icon.icns` — macOS
- `icon.ico` — Windows
- `32x32.png`, `128x128.png` — Linux/generic

---

## Phase 7: CI/CD Pipeline

**Goal**: Automated builds for all platforms.
**Duration**: 0.5 day

### GitHub Actions Matrix
```yaml
matrix:
  include:
    - platform: ubuntu-22.04      # Linux x64
    - platform: macos-latest      # macOS ARM64
      args: '--target aarch64-apple-darwin'
    - platform: macos-latest      # macOS Intel
      args: '--target x86_64-apple-darwin'
    - platform: windows-latest    # Windows x64
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| macOS thread safety issues | Medium | High | Use MainThreadMarker, test thoroughly |
| Windows WebView2 not installed | Low | Medium | downloadBootstrapper handles this |
| portable-pty Windows bugs | Medium | Medium | Stay on 0.8.x |
| GTK refactor breaks Linux | Medium | High | Test Linux after each change |

---

## Implementation Order

1. **Phase 1**: Create browser module structure, move Linux code, add stubs ✅ COMPLETE
   - *Verified*: Linux builds and runs
   
2. **Phase 5**: Switch socket to TCP ✅ COMPLETE
   - *Verified*: Builds, uses `127.0.0.1:<random_port>` with port file discovery
   
3. **Phase 4**: Shell/font detection cross-platform ✅ COMPLETE
   - *Verified*: Cross-compiles (on Linux)
   
4. **Phase 6**: Build configuration ✅ COMPLETE
   - *Verified*: `cargo build` succeeds
   
5. **Phase 2**: macOS browser implementation ⬜ TODO
   - *Test*: On macOS hardware
   
6. **Phase 3**: Windows browser implementation ⬜ TODO
   - *Test*: On Windows hardware
   
7. **Phase 7**: CI/CD pipeline ⬜ TODO

---

## Files to Create/Modify

### New Files
- `src-tauri/src/browser/mod.rs`
- `src-tauri/src/browser/linux.rs`
- `src-tauri/src/browser/macos.rs`
- `src-tauri/src/browser/windows.rs`
- `.github/workflows/release.yml`

### Modified Files
- `src-tauri/src/commands/browser.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/socket.rs`
- `src-tauri/src/terminal_config.rs`
- `src-tauri/src/commands/terminal.rs`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

---

## References

- [Tauri v2 Documentation](https://v2.tauri.app/)
- [wry GitHub](https://github.com/tauri-apps/wry) — WebView abstraction
- [portable-pty GitHub](https://github.com/wez/wezterm/tree/main/pty) — PTY library
- [BridgeSpace RE Docs](../bridgespace-re/) — Competitive reference
- [tauri-action](https://github.com/tauri-apps/tauri-action) — CI/CD
