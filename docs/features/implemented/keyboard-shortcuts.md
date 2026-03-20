# Keyboard Shortcuts

Shortcuts now use a centralized keybinding system with defaults + user overrides.

## Architecture

- Definitions and defaults: `src/lib/keybindings.ts`
- Runtime store and overrides: `src/stores/keybindingStore.ts`
- Global dispatcher: `src/components/layout/AppShell.tsx`
- Terminal-level overrides: `src/components/terminal/XTermWrapper.tsx`
- Remapping UI: `src/components/layout/KeybindingsModal.tsx`

## Default Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+Shift+P` | Open command palette |
| `Ctrl+,` | Open keyboard shortcuts |
| `Ctrl+Shift+N` | New workspace |
| `Ctrl+Tab` | Next workspace |
| `Ctrl+Shift+Tab` | Previous workspace |
| `Ctrl+Shift+W` | Close workspace |
| `Ctrl+1..8` | Jump to workspace 1..8 |
| `Ctrl+9` | Jump to last workspace |
| `Ctrl+Shift+H` | Flash focused pane |
| `Ctrl+Alt+Arrow` | Focus adjacent pane |
| `Ctrl+Alt+D` | Split pane right |
| `Ctrl+Alt+Shift+D` | Split pane down |
| `Ctrl+Alt+W` | Close active pane |
| `Ctrl+Shift+L` | Open browser tab in active pane |
| `Ctrl+Shift+Enter` | Toggle pane zoom |
| `Ctrl+Shift+F` | Find in terminal |
| `Shift+Enter` | Send kitty protocol `\x1b[13;2u` |

## User Remapping

- Open **Keyboard Shortcuts** with `Ctrl+,` or via Command Palette (`Settings: Keyboard Shortcuts`).
- Click **Rebind**, then press your new shortcut.
- Press `Backspace` or `Delete` while rebinding to clear an override.
- Use **Restore defaults** to clear all overrides.
- Conflicts are highlighted in the modal.

Overrides are persisted inside app settings and loaded on startup.
