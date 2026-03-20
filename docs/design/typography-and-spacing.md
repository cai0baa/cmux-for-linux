# Typography & Spacing

## Font Stacks

### UI Text
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```
Used in: `html, body`, UI labels, buttons.

### Terminal
```
'${user_font}', monospace              — from config detection
```
Fallback chain: `'JetBrainsMono Nerd Font Mono', 'JetBrains Mono', 'Geist Mono', 'SF Mono', monospace`

### Monospace UI
```css
font-family: 'JetBrains Mono', 'Geist Mono', monospace;
```
Used in: PaneTabBar labels, restart button, URL bar.

## Type Scale

| Context | Size | Weight | Location |
|---------|------|--------|----------|
| Terminal content | User config (default 14px) | 400 / 600 bold | XTermWrapper |
| Pane tab labels | 13px | inherit | PaneTabBar |
| Pill badges | 11px | 500 | `.cmux-pill` |
| URL bar input | 12px | inherit | BrowserPane |
| Restart button | 12px | inherit | TerminalPane |

## Terminal Font Configuration

The font size goes through a scaling pipeline:

```
User's native terminal config (e.g. Ghostty font-size = 9)
  → Rust terminal_config::load()
    → JS: rawSize < 12 ? Math.round(rawSize * 1.6) : rawSize
      → Math.max(14, scaled)
        → xterm.js fontSize option
```

Reason: Native terminals use physical pixels; Tauri webview uses CSS pixels. Values below 12 are assumed to be physical pixel sizes and scaled up.

## Font Rendering

```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;

/* Terminal-specific */
.xterm-rows {
  font-variant-ligatures: none;
  text-rendering: geometricPrecision;
  font-feature-settings: "liga" 0, "calt" 0;
}

canvas {
  image-rendering: -webkit-optimize-contrast;
}
```

Ligatures are explicitly disabled in terminal content. Canvas uses `optimize-contrast` for sharper glyphs on Linux/WebKitGTK.

## Spacing Constants (`lib/constants.ts`)

| Constant | Value | Usage |
|----------|-------|-------|
| `PANE_HEADER_HEIGHT` | 36px | PaneTabBar height |
| `TAB_BAR_HEIGHT` | 36px | Sidebar tab height |
| `SIDEBAR_WIDTH` | 200px | Sidebar width |

## xterm.js Terminal Options

```typescript
{
  fontSize: 14,           // after scaling
  fontWeight: 400,
  fontWeightBold: 600,
  letterSpacing: -1,      // tighter tracking
  lineHeight: 1.0,        // no extra line spacing
  scrollback: 5000,       // lines of scrollback buffer
  smoothScrollDuration: 0, // instant scroll
}
```
