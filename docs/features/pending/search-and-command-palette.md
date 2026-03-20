# Search & Command Palette

## Terminal Find Bar

In-terminal text search with regex support, match highlighting, and wrap-around navigation.

### cmux Reference
- Integrated find bar overlay within each terminal pane
- Supports regex and case-sensitive toggles
- Keyboard: `Ctrl+Shift+F` to open, `Enter`/`Shift+Enter` to navigate matches
- Matches highlighted in scrollback buffer via xterm.js search addon

### ptrterminal Requirements

| Layer | What's Needed |
|-------|---------------|
| Frontend | `TerminalSearchBar.tsx` overlay component inside `TerminalPane` |
| xterm.js | `@xterm/addon-search` — already available, needs wiring |
| Store | Search state per pane in `paneMetaStore` (query, matchIndex, matchCount) |
| Keyboard | Bind `Ctrl+Shift+F` in `XTermWrapper` key handler |

### Priority: **High**
Core terminal UX — users expect in-terminal search.

---

## Command Palette (`Ctrl+Shift+P`)

Global fuzzy-search overlay for all actions: workspace switching, theme changes, agent launch, pane operations.

### cmux Reference
- `Cmd+Shift+P` opens palette with cached results for performance
- Categories: workspaces, surfaces, actions, settings
- Fuzzy matching with ranked results
- Recent actions pinned to top

### ptrterminal Requirements

| Layer | What's Needed |
|-------|---------------|
| Frontend | `CommandPalette.tsx` modal with fuzzy input, categorized results |
| Library | `fuse.js` or similar for client-side fuzzy search |
| Store | Registry of all available actions (workspace ops, theme switch, agent launch, splits) |
| Keyboard | Global `Ctrl+Shift+P` handler at `AppShell` level |

### Priority: **High**
Power-user productivity feature — enables fast access to all functionality.
