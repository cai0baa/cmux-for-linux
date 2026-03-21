# BridgeSpace Reverse Engineering Findings

Organized findings from binary analysis of BridgeSpace v2.2.2 across all three platform releases.
This research informs the ptrcode architecture and competitive strategy.

## Scope

Three binaries analyzed:
- **Linux**: `.deb` package (ELF x86-64, GTK + webkit2gtk)
- **macOS**: `.dmg` disk image (arm64 Mach-O, WKWebView)
- **Windows**: `.exe` NSIS installer (PE32+ x86-64, WebView2)

Extraction methods: `ar`, `dpkg-deb`, `7z`, `apfs-fuse`, `7z` (NSIS), `strings`, binary pattern search.

## Key Takeaway

BridgeSpace runs the **same Tauri v2 + React frontend** on all three platforms. The multi-agent
protocol is entirely local and file/CLI based — no cloud coordination required:

- **Persistent state**: `SWARM_BOARD.md` (shared markdown file)
- **Real-time messaging**: `bs-mail` CLI
- **Coordination service**: local HTTP + WebSocket on port 7242
- **Role injection**: CLAUDE.md / GEMINI.md written per agent pane

BridgeSpace version: **2.2.2** | Bundle ID: `io.bridgemind.bridgespace`

## Index

| Section | File | Contents |
|---------|------|----------|
| 01 | [tech-stack.md](01-stack/tech-stack.md) | Library versions across all platforms |
| 02 | [application-architecture.md](02-architecture/application-architecture.md) | Tauri IPC, plugins, app structure |
| 03a | [linux-deb.md](03-platforms/linux-deb.md) | Linux-specific findings |
| 03b | [macos-dmg.md](03-platforms/macos-dmg.md) | macOS-specific findings |
| 03c | [windows-exe.md](03-platforms/windows-exe.md) | Windows-specific findings |
| 04 | [swarm-protocol.md](04-multiagent/swarm-protocol.md) | **Multi-agent protocol (highest value)** |
| 05 | [js-bundles.md](05-frontend/js-bundles.md) | JS chunk inventory, implied routes |
| 06 | [auth-system.md](06-auth/auth-system.md) | OAuth2, fingerprinting, encryption |
| 07 | [voice-system.md](07-voice/voice-system.md) | BridgeVoice, Whisper.cpp |
| 08 | [network-layer.md](08-network/network-layer.md) | HTTP/WebSocket stack, port 7242 |
| 09 | [ptrcode-gaps.md](09-competitive/ptrcode-gaps.md) | Gap analysis and ptrcode build order |
