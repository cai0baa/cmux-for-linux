# Input & Interaction Enhancements

## Copy Mode

Vi-style keyboard selection for scrollback buffer navigation without mouse.

| Detail | Description |
|--------|-------------|
| cmux | `Cmd+Shift+C` enters copy mode with vi motions (h/j/k/l, w/b, /, ?) |
| Needs | xterm.js selection API, key handler state machine, visual mode indicator |
| Priority | **Medium** |

## Broadcast Input

Type once, send to all visible panes simultaneously.

| Detail | Description |
|--------|-------------|
| cmux | Toggle via `Cmd+Shift+B`, visual indicator on active panes |
| Needs | Broadcast flag in workspace store, input tee in `XTermWrapper.onData` |
| Priority | **Low** |

## Drag-and-Drop

Drop files into terminal to paste paths, drop tabs to reorder.

| Detail | Description |
|--------|-------------|
| cmux | File drop inserts escaped path, tab drag reorders workspaces |
| Needs | `onDrop` handlers on `TerminalPane` (file→path) and `TabBar` (reorder) |
| Priority | **Medium** |

## Context Menus

Right-click menus for copy, paste, split, close, search, notifications.

| Detail | Description |
|--------|-------------|
| cmux | Custom right-click menu with copy/paste/split/zoom/flash actions |
| Needs | `ContextMenu.tsx` component, right-click handler on panes |
| Priority | **Medium** |

## Zoom Pane

Temporarily maximize a single pane to fullscreen, toggle back.

| Detail | Description |
|--------|-------------|
| cmux | `Cmd+Shift+Enter` zooms pane, same shortcut unzooms |
| Needs | `zoomedPaneId` state in workspace store, CSS fullscreen overlay |
| Priority | **High** |

## Vim Mode Badge

Visual indicator showing vim/neovim mode (NORMAL/INSERT/VISUAL) in pane chrome.

| Detail | Description |
|--------|-------------|
| cmux | Parses terminal escape sequences to detect vim mode changes |
| Needs | Escape sequence parser in `XTermWrapper`, badge in `PaneTabBar` |
| Priority | **Low** |

## Custom Keybindings

User-configurable keyboard shortcuts with conflict detection.

| Detail | Description |
|--------|-------------|
| cmux | `KeyboardShortcutSettings` with 40+ configurable actions, JSON config |
| Needs | Keybinding registry, settings UI, JSON config file, conflict resolver |
| Priority | **Medium** |

## Clipboard Images

Paste images from clipboard into terminal (base64 or file path).

| Detail | Description |
|--------|-------------|
| cmux | Detects image clipboard content, offers paste-as-path or inline |
| Needs | Clipboard API image detection, temp file save via Rust, path insertion |
| Priority | **Low** |

## URL Detection & Routing

Clickable URLs in terminal output, configurable open behavior.

| Detail | Description |
|--------|-------------|
| cmux | Regex URL detection with Cmd+click to open, configurable handler |
| Needs | xterm.js `WebLinksAddon`, Tauri `shell.open` for external URLs |
| Priority | **High** |

## Focus-Follows-Mouse

Automatically focus pane when mouse enters (optional setting).

| Detail | Description |
|--------|-------------|
| cmux | Toggle in settings, `mouseenter` event triggers pane focus |
| Needs | `onMouseEnter` handler on `TerminalPane`, setting in preferences |
| Priority | **Low** |
