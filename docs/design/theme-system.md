# Theme System

## ThemeDefinition Structure

```typescript
interface ThemeDefinition {
  id: string;
  name: string;
  terminal: TerminalColors;  // Applied to xterm.js
  chrome: {                  // Applied to UI wrapper
    background: string;      // Deepest layer (sidebar, app bg)
    surface: string;         // Elevated surfaces (pane bg)
    border: string;          // Borders and dividers
    text: string;            // Primary text
    textMuted: string;       // Secondary/inactive text
    accent: string;          // Active indicators, links
  };
}
```

`TerminalColors` has 20 fields: `background`, `foreground`, `cursor`, `selectionBackground`, plus 16 ANSI colors (`black` through `brightWhite`).

## Bundled Themes (9)

| ID | Name | Terminal BG | Accent |
|----|------|-------------|--------|
| `midnight` | Midnight | `#0a0a0a` | `#89b4fa` |
| `catppuccin-mocha` | Catppuccin Mocha | `#1e1e2e` | `#89b4fa` |
| `dracula` | Dracula | `#282a36` | `#bd93f9` |
| `nord` | Nord | `#2e3440` | `#88c0d0` |
| `one-dark` | One Dark | `#282c34` | `#61afef` |
| `tokyo-night` | Tokyo Night | `#1a1b26` | `#7aa2f7` |
| `gruvbox-dark` | Gruvbox Dark | `#282828` | `#fabd2f` |
| `solarized-dark` | Solarized Dark | `#002b36` | `#268bd2` |
| `github-dark` | GitHub Dark | `#0d1117` | `#58a6ff` |

Default theme: `midnight`.

## How to Add a Theme

1. Add a `ThemeDefinition` object to the `THEMES` array in `src/components/theme/themeDefinitions.ts`
2. Define all 20 terminal colors + 6 chrome colors
3. Theme is immediately available in `ThemeSwitcher`

No registration step needed — the `THEMES` array is the registry.

```typescript
{
  id: "my-theme",
  name: "My Theme",
  terminal: {
    background: "#...",
    foreground: "#...",
    cursor: "#...",
    selectionBackground: "#...",
    // ... 16 ANSI colors
  },
  chrome: {
    background: "#...",  // darkest
    surface: "#...",     // slightly lighter
    border: "#...",
    text: "#...",
    textMuted: "#...",
    accent: "#...",
  },
}
```

## Runtime Theme Switching

```
ThemeSwitcher.onClick(themeId)
  → themeStore.setTheme(id)
    → getTheme(id) looks up THEMES array
    → store.theme updated
      → Components re-render with new theme
      → XTermWrapper applies theme to xterm.js options
```

Theme selection persists via `saveSettings({ theme_id })` → `data.json`.

## Theme Layering

The chrome layer intentionally uses colors slightly different from the terminal:

```
chrome.background  ← darkest (sidebar, app shell)
chrome.surface     ← terminal container background
terminal.background ← xterm.js canvas
```

This creates subtle depth separation between UI chrome and terminal content.
