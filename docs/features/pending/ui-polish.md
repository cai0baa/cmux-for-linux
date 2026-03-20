# UI Polish & Visual Enhancements

## Glassmorphism Effects

Frosted glass blur on sidebar and overlays for depth.

| Detail | Description |
|--------|-------------|
| cmux | `NSVisualEffectView` with blur materials on sidebar, palette, dialogs |
| Needs | CSS `backdrop-filter: blur()` on sidebar, command palette, dialogs |
| Caveat | WebKit in Tauri webview supports `backdrop-filter`; performance cost on Linux |
| Priority | **Low** |

## Error & Loading States

Graceful handling of PTY failures, config load errors, empty states.

| Detail | Description |
|--------|-------------|
| cmux | Error boundaries per surface, retry buttons, descriptive error messages |
| Needs | `ErrorBoundary.tsx` wrapper, per-pane error state, retry action |
| Needs | Loading skeleton in `TerminalPane` during PTY spawn |
| Needs | Empty state for new workspaces with quick-action buttons |
| Priority | **High** |

## Notification Sounds & Panel

Audio feedback for notifications plus a centralized notification panel.

| Detail | Description |
|--------|-------------|
| cmux | `UNUserNotificationCenter` with system + custom sounds, notification panel with timeline |
| Needs | Web Audio API or `<audio>` for sound playback |
| Needs | `NotificationPanel.tsx` — slide-out panel listing all notifications |
| Needs | Sound settings (enable/disable, volume, custom sounds) |
| Priority | **Medium** |

## Light Theme

Full light theme for daytime use and accessibility.

| Detail | Description |
|--------|-------------|
| cmux | Light theme with appropriate terminal colors |
| Needs | New `ThemeDefinition` with light background, dark text |
| Needs | Adjust all CSS custom properties for light context |
| Needs | `prefers-color-scheme: light` auto-detection |
| Priority | **Medium** |

## Sidebar Metadata

Rich workspace info in sidebar: pane count, running processes, Git branch.

| Detail | Description |
|--------|-------------|
| cmux | Tab bar shows workspace color, title, icon, dirty indicator, notification badge, Git branch |
| Needs | Extend `TabItem` with metadata display (pane count, active process) |
| Needs | Git branch detection via Rust `git2` crate or shell command |
| Priority | **Medium** |

## Port Scanner

Detect and display listening ports from terminal processes.

| Detail | Description |
|--------|-------------|
| cmux | Background port monitoring, clickable port links to open in browser pane |
| Needs | Rust module scanning `/proc/net/tcp` or `ss` output periodically |
| Needs | Port list UI in pane chrome or sidebar |
| Needs | Click-to-open behavior routing to browser pane |
| Priority | **Low** |

## Markdown Viewer Pane

Render markdown files as formatted HTML in a pane.

| Detail | Description |
|--------|-------------|
| cmux | Markdown panel type using `WKWebView` with rendered HTML |
| Needs | `MarkdownPane.tsx` component with `react-markdown` or `marked` |
| Needs | File watcher for live reload on save |
| Needs | Pane type enum extension in workspace types |
| Priority | **Low** |

## Session Restore

Restore full workspace layout, pane positions, and running processes on app restart.

| Detail | Description |
|--------|-------------|
| cmux | Full geometry + workspace + surface persistence, process re-spawn on launch |
| Current | ptrterminal persists workspace structure but not window geometry or process state |
| Needs | Window position/size persistence via Tauri window APIs |
| Needs | Process CWD capture and restore (re-`cd` on spawn) |
| Needs | Optional: restore scroll position and recent output |
| Priority | **High** |
