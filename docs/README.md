# ptrterminal Documentation

AI agent terminal workspace built with Tauri v2 + React + xterm.js.

## Navigation

### Infrastructure
- [stack.md](infrastructure/stack.md) — Tech stack with versions & rationale
- [architecture.md](infrastructure/architecture.md) — Process model, module map, state ownership
- [data-flow.md](infrastructure/data-flow.md) — Input/output/resize/persistence data paths
- [rust-backend.md](infrastructure/rust-backend.md) — All Rust modules, commands, types
- [frontend-structure.md](infrastructure/frontend-structure.md) — Component tree, stores, hooks, types
- [build-and-dev.md](infrastructure/build-and-dev.md) — Dev commands, Vite/Tauri config, env vars

### Design
- [overview.md](design/overview.md) — Design philosophy, visual identity, principles
- [theme-system.md](design/theme-system.md) — ThemeDefinition structure, 9 themes, how to add
- [colors-and-tokens.md](design/colors-and-tokens.md) — CSS custom properties, opacity scale, semantic usage
- [typography-and-spacing.md](design/typography-and-spacing.md) — Font stacks, type scale, spacing constants
- [component-patterns.md](design/component-patterns.md) — Pill, button, tab, pane, sidebar, grid patterns
- [animations-and-states.md](design/animations-and-states.md) — Transitions, keyframes, hover/active/disabled states

### Features — Implemented
- [terminal-core.md](features/implemented/terminal-core.md) — xterm.js, PTY, WebGL, resize, scrollback
- [workspaces-and-layout.md](features/implemented/workspaces-and-layout.md) — Workspaces, grid templates, splitting, tabs-per-pane
- [agents.md](features/implemented/agents.md) — Agent system (shell, claude-code, codex, gemini, aider)
- [theming.md](features/implemented/theming.md) — 9 bundled themes, runtime switching
- [persistence.md](features/implemented/persistence.md) — JSON storage, save/load flow, what persists
- [notifications.md](features/implemented/notifications.md) — Badge counts, pane flash, tab aggregation
- [keyboard-shortcuts.md](features/implemented/keyboard-shortcuts.md) — All shortcuts with behaviors
- [browser-pane.md](features/implemented/browser-pane.md) — iframe browser, URL bar, limitations
- [config-detection.md](features/implemented/config-detection.md) — ghostty/alacritty/kitty auto-detection

### Features — Pending (from cmux reference)
- [search-and-command-palette.md](features/pending/search-and-command-palette.md) — Terminal find bar, Ctrl+Shift+P palette
- [ssh-remote-sessions.md](features/pending/ssh-remote-sessions.md) — SSH daemon, reconnect, port forwarding
- [rich-browser.md](features/pending/rich-browser.md) — Profiles, history, DevTools, search engine
- [socket-api-and-automation.md](features/pending/socket-api-and-automation.md) — Unix socket JSON-RPC, CLI tool
- [input-and-interaction.md](features/pending/input-and-interaction.md) — Copy mode, broadcast, drag-drop, zoom, keybindings
- [accessibility-and-motion.md](features/pending/accessibility-and-motion.md) — ARIA, high contrast, reduced motion, i18n
- [ui-polish.md](features/pending/ui-polish.md) — Glassmorphism, error states, notification sounds, light theme
