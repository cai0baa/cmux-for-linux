# macOS Platform Findings — .dmg Disk Image

## Extraction Process

```bash
# DMG is zlib-compressed HFS+/APFS
7z x BridgeSpace-arm64.dmg -o/tmp/bs_dmg_raw/
apfs-fuse /tmp/bs_dmg_raw/<volume> /tmp/bs_dmg/
# App bundle now at /tmp/bs_dmg/BridgeSpace.app/
```

## Binary

| Property | Value |
|----------|-------|
| Path | `BridgeSpace.app/Contents/MacOS/bridgespace-tauri` |
| Format | Mach-O arm64 |
| Architecture | Apple Silicon (arm64 only — no universal binary) |
| Code signing | Present (ad-hoc or Developer ID) |

## Info.plist Metadata

| Key | Value |
|-----|-------|
| `CFBundleIdentifier` | `io.bridgemind.bridgespace` |
| `CFBundleVersion` | `2.2.2` |
| `CFBundleShortVersionString` | `2.2.2` |
| `LSMinimumSystemVersion` | (macOS 11+ inferred from Tauri v2 requirements) |
| `NSSupportsAutomaticGraphicsSwitching` | `YES` |
| `NSHighResolutionCapable` | `YES` |

## WebView Implementation

- Uses **WKWebView** (macOS native WebKit)
- Managed by wry (the Tauri WebView abstraction layer)
- Browser pane embedded via `NSView` hierarchy (macOS equivalent of GTK overlay)
- No Chromium — pure WebKit, same engine as Safari

## Build Path Evidence

Found in binary strings:
```
/Users/runner/work/bridgespace-tauri/bridgespace-tauri/src-tauri/
```
Confirms GitHub Actions macOS runner (`macos-latest` or `macos-14`).
Repository name: `bridgespace-tauri` (private).

## CSP Configuration

Extracted from binary strings — Content Security Policy injected into WKWebView:
```
default-src 'self' http://127.0.0.1:7242 https://api.bridgemind.ai https://app.bridgemind.ai
```

## Key macOS-Specific Strings Found

- `io.bridgemind.bridgespace` — bundle ID used for keychain, deep links
- `bridgespace://` — custom URL scheme for OAuth deep-link callback
- `bridgespace-auth-salt` — credential encryption salt (same on all platforms)
- OSC 133 shell integration sequences
- `BRIDGESPACE_SHELL_INTEGRATION=1`

## App Bundle Structure

```
BridgeSpace.app/
├── Contents/
│   ├── Info.plist
│   ├── MacOS/
│   │   └── bridgespace-tauri    ← main binary
│   ├── Resources/
│   │   └── (icons, assets)
│   └── _CodeSignature/
│       └── CodeResources
```

## Notes for ptrcode macOS Port

- ptrcode would need `WKWebView` + `NSView` embedding for the browser pane (currently only GTK)
- The wry crate handles this automatically — the `BrowserManager` GTK-specific code needs
  `#[cfg(target_os = "linux")]` guards with a wry-native fallback for macOS/Windows
- arm64 + x86-64 universal binary would be ideal but arm64-only is acceptable initially
