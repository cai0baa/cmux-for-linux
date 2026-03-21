# Tech Stack — BridgeSpace v2.2.2

All versions confirmed from binary string extraction across .deb, .dmg, and .exe.

## Rust Backend (all platforms identical)

| Library | Version | Purpose |
|---------|---------|---------|
| `portable-pty` | 0.8.1 | PTY spawning (Linux + macOS) |
| `tokio` | 1.49.0 | Async runtime |
| `hyper` | 1.8.1 | HTTP server/client core |
| `reqwest` | 0.12 / 0.13 | HTTP client (dual version present) |
| `h2` | 0.4.13 | HTTP/2 support |
| `rustls` | (latest at build time) | TLS — no OpenSSL dependency |
| `tauri` | v2 | App framework (confirmed by plugin naming) |
| `wry` | (bundled with tauri) | Cross-platform WebView abstraction |
| `serde` / `serde_json` | (standard) | JSON serialization |

## Frontend (shared across all platforms)

| Technology | Evidence |
|------------|----------|
| **React** | Component names in JS chunks (`.tsx` patterns, hooks) |
| **Vite** | Content-hash file naming (`-XXXXXXXX.js` pattern) |
| **TypeScript** | `.tsx` chunk naming conventions |
| **xterm.js** | Shell integration OSC 133 sequences |
| **Tauri v2 IPC** | `__CHANNEL__` prefix in binary strings |

## WebView Layer (platform-specific)

| Platform | WebView | Notes |
|----------|---------|-------|
| Linux | webkit2gtk | GTK overlay for browser pane embedding |
| macOS | WKWebView | Via wry — native WebKit |
| Windows | WebView2 | Microsoft Chromium-based, bundled or system |

## Voice (BridgeVoice)

| Component | Details |
|-----------|---------|
| Engine | Whisper.cpp |
| Model format | ggml (tiny / base / small / medium variants) |
| Runtime | Local, on-device inference — no cloud |

## Build System

- **CI**: GitHub Actions (build path `/Users/runner/work/bridgespace-tauri/` in macOS binary)
- **Bundler**: Vite (frontend), Cargo (backend)
- **Installer**: NSIS v3.11 (Windows), standard DMG (macOS), Debian package (Linux)

## Notable Absences

- No OpenSSL (rustls used instead — simpler cross-platform TLS)
- No Electron (pure Tauri — smaller binary, native WebView)
- No Node.js runtime (frontend is compiled to static assets, served by Tauri)
- No tmux dependency (native PTY via portable-pty)
