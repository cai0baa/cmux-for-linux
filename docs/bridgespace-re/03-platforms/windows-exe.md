# Windows Platform Findings — NSIS Installer (.exe)

## Extraction Process

```bash
# NSIS installer — extract with 7z
7z x BridgeSpace-setup.exe -o/tmp/bs_exe/
# Main binary at /tmp/bs_exe/bridgespace-tauri.exe (or $INSTDIR equivalent)
```

## Installer

| Property | Value |
|----------|-------|
| Installer type | NSIS (Nullsoft Scriptable Install System) |
| NSIS version | v3.11 |
| Windows compatibility | Windows 7+ |
| Architecture | x86-64 |

## Binary

| Property | Value |
|----------|-------|
| Format | PE32+ (64-bit) |
| Architecture | x86-64 |
| Extracted path | `/tmp/bs_exe/bridgespace-tauri.exe` |

## WebView Implementation

- Uses **WebView2** (Microsoft's Chromium-based WebView)
- WebView2 is either bundled with the installer or uses the system-installed runtime
- NSIS installer likely checks for WebView2 runtime and installs if missing
- Implication: Chromium rendering engine on Windows (vs WebKit on Linux/macOS)

## PTY on Windows

- BridgeSpace uses **ConPTY** (Windows Console PTY API) instead of `portable-pty` for Windows
- ConPTY is the modern Windows virtual terminal API (available since Windows 10 v1809)
- `portable-pty` crate supports ConPTY internally — may still be used as wrapper

## Key Strings Found in Windows Binary

- `bridgespace-auth-salt` — same credential encryption salt as macOS/Linux
- `http://127.0.0.1:7242` — same local service port
- Same JS bundle asset names as macOS (confirms unified frontend build)
- `BRIDGESPACE_SHELL_INTEGRATION=1` — same env var
- No swarm-specific hardcoded role strings (dynamically loaded)

## Windows-Specific Shell Integration

- OSC 133 sequences (same as Linux/macOS — works in Windows Terminal + ConPTY)
- PowerShell and cmd.exe as default shells (vs bash/zsh on Unix)
- `COMSPEC` environment variable used for shell detection (Windows convention)

## Notable: No Swarm Code in NSIS Wrapper

The NSIS installer wrapper itself contains no multi-agent strings. All swarm coordination
logic is in the main `bridgespace-tauri.exe` binary and dynamically loaded configuration.

## Installer Behavior (inferred from NSIS structure)

1. Check for WebView2 runtime, install if missing
2. Extract `bridgespace-tauri.exe` to `%LOCALAPPDATA%\BridgeSpace\`
3. Create Start Menu shortcuts
4. Register `bridgespace://` URL scheme for OAuth deep links
5. Optionally install Visual C++ redistributables

## Notes for ptrcode Windows Port

- ptrcode would need WebView2 for the browser pane on Windows
- The wry crate handles WebView2 integration automatically
- Current GTK-specific `BrowserManager` code needs `#[cfg]` guards
- Socket API: replace Unix domain socket with Windows named pipes or keep TCP (port-based)
- Shell defaults: `cmd.exe` or PowerShell (currently hardcoded to `bash`)
