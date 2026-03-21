# Linux Platform Findings — .deb Package

## Package Format

- **Type**: Debian archive (`.deb`)
- **Extraction**: `ar x bridgespace.deb && tar xf data.tar.*`
- **Analysis method**: This was the first binary analyzed; served as baseline

## Binary

| Property | Value |
|----------|-------|
| Path | `/usr/bin/bridgespace-tauri` |
| Format | ELF x86-64 |
| Linkage | Dynamically linked (GTK, webkit2gtk as system deps) |

## WebView Implementation

- Uses **webkit2gtk** (system package dependency)
- **GTK overlay** technique for browser pane embedding: a `GtkOverlay` widget sits on top of the
  main Tauri window, and the WebView for the browser pane is embedded as a GTK child widget
- This is the same approach ptrterminal uses for its browser pane
- Implication: the browser pane on Linux is a true native WebKit instance — full rendering fidelity

## Package Contents

Standard Tauri Linux bundle layout:
```
/usr/bin/bridgespace-tauri       ← main binary
/usr/share/applications/         ← .desktop file (app menu entry)
/usr/share/icons/                ← app icon (multiple resolutions)
/usr/lib/bridgespace/            ← additional resources if any
```

## GTK-Specific Dependencies

webkit2gtk and GTK are runtime dependencies — not bundled. The app assumes a standard GNOME/GTK
desktop environment. This is the same assumption ptrterminal makes.

## Baseline Comparison with ptrterminal

| Feature | BridgeSpace Linux | ptrterminal |
|---------|------------------|-------------|
| PTY | portable-pty 0.8.1 | portable-pty (same version range) |
| WebView | webkit2gtk | webkit2gtk |
| Browser embedding | GTK overlay | GTK overlay |
| Socket API | port 7242 (HTTP) | Unix domain socket (`ptr.sock`) |
| Build targets | .deb + .AppImage | .deb + .AppImage |

The Linux implementation is architecturally identical to ptrterminal at the platform layer.
