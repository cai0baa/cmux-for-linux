# Theming

## 9 Bundled Themes

All dark themes, covering major terminal color schemes:

- Midnight (default) — deepest black
- Catppuccin Mocha — warm purple-blue
- Dracula — purple accent
- Nord — cool blue-grey
- One Dark — Atom-inspired
- Tokyo Night — Japanese night palette
- Gruvbox Dark — warm retro
- Solarized Dark — classic dual-mode
- GitHub Dark — GitHub's dark mode

## Runtime Switching

`ThemeSwitcher` component (in sidebar) lists all themes. Selecting one:

1. `themeStore.setTheme(id)` → updates store
2. `getTheme(id)` looks up the `THEMES` array
3. Components reading `themeStore` re-render with new colors
4. `saveSettings({ theme_id })` persists choice to disk

## What Gets Themed

| Target | Source | Mechanism |
|--------|--------|-----------|
| xterm.js terminal | `theme.terminal.*` | `term.options.theme = ITheme` |
| Sidebar, title bar | `theme.chrome.*` | Inline styles reading store |
| Pane headers | Hardcoded `#1a1a1a` | Not theme-driven (TODO) |
| CSS variables | `global.css :root` | Static, not updated by theme |

Note: CSS custom properties (`--cmux-*`) are currently static. Theme switching works through inline styles and xterm.js theme options, not CSS variable updates.

## Config-Detected Colors

On first load, `terminal_config.rs` detects colors from the user's native terminal (ghostty/alacritty/kitty). These are used as the xterm.js theme, overriding the default theme's terminal colors.

The chrome UI colors always come from the selected `ThemeDefinition`.

## Persistence

- Stored in `data.json` as `settings.theme_id`
- Default: `"catppuccin-mocha"` in Rust, `"midnight"` in `themeStore`
- Font size also persists: `settings.font_size`
