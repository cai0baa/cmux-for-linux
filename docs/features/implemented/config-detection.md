# Terminal Config Detection

## Overview

On startup, `terminal_config.rs` reads the user's native terminal configuration to match font family, font size, and color palette. This makes ptrterminal look like the user's existing terminal.

## Detection Order

```
ghostty → alacritty → kitty → system defaults
```

First match wins for each property. Font and colors can come from different sources:
- **Font**: First terminal with a configured font
- **Colors**: First terminal with explicit palette entries

## Config File Paths

| Terminal | Config Path | Theme Path |
|----------|-----------|------------|
| Ghostty | `~/.config/ghostty/config` | Via `config-file` directive |
| Alacritty | `~/.config/alacritty/alacritty.toml` | `~/.config/omarchy/current/theme/alacritty.toml` |
| Kitty | `~/.config/kitty/kitty.conf` | Inline in config |

## Ghostty Parser

Reads key-value pairs (`key = value`):
- `font-family` → font family name
- `font-size` → float
- `config-file` → loads included theme file (supports `?` optional prefix)
- `background`, `foreground` → hex colors
- `palette = N=#rrggbb` → ANSI color N (0-15)

## Alacritty Parser

TOML-style sections:
- `[font.normal]` → `family` key
- Root → `size` key
- `[colors.primary]` → `background`, `foreground`
- `[colors.normal]` → 8 color names (black, red, green, ...)
- `[colors.bright]` → 8 bright color names

Checks omarchy theme file first, falls back to main config.

## Kitty Parser

Simple key-value:
- `font_family` → font family
- `font_size` → float
- `background`, `foreground` → hex colors
- `color0` through `color15` → ANSI colors

## Fallback Defaults

```rust
TerminalUserConfig {
  font_family: system_monospace_font(), // fc-match monospace
  font_size: 15.0,
  colors: UserColors::default(),        // One Dark-ish palette
}
```

`system_monospace_font()` calls `fc-match monospace --format=%{family}` on Linux.

## Font Size Scaling

Native terminals use physical pixels; Tauri webview uses CSS pixels. XTermWrapper applies:

```typescript
const scaled = rawSize < 12 ? Math.round(rawSize * 1.6) : rawSize;
const fontSize = Math.max(14, scaled);
```

Example: Ghostty `font-size = 9` → `Math.round(9 * 1.6) = 14` → `Math.max(14, 14) = 14px`

## Caching

Config is loaded once and cached globally in XTermWrapper:
```typescript
let cachedConfig: { theme: ITheme; fontSize: number; fontFamily: string } | null = null;
```

`preloadTerminalConfig()` is called at module level in `App.tsx` to start the fetch before any terminal mounts.
