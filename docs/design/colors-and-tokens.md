# Colors & Design Tokens

## CSS Custom Properties (`global.css`)

```css
:root {
  --cmux-bg: #0a0a0a;
  --cmux-sidebar: #1E1E1E;
  --cmux-accent: #0A84FF;
  --cmux-border: rgba(255, 255, 255, 0.1);
  --cmux-text: rgba(255, 255, 255, 0.9);
  --cmux-text-secondary: rgba(255, 255, 255, 0.6);
  --cmux-text-tertiary: rgba(255, 255, 255, 0.3);
}
```

Note: These are static fallback values. Theme-driven colors come from `ThemeDefinition.chrome.*` applied via inline styles.

## Opacity Scale

| Token | Opacity | Usage |
|-------|---------|-------|
| `--cmux-text` | 0.9 | Primary text, labels |
| `--cmux-text-secondary` | 0.6 | Inactive tabs, descriptions |
| `--cmux-text-tertiary` | 0.3 | Placeholders, disabled controls |
| `--cmux-border` | 0.1 | Borders, dividers |

## Semantic Color Usage

| Context | Color Source | Example |
|---------|-------------|---------|
| App background | `--cmux-bg` / `chrome.background` | `#0a0a0a` |
| Sidebar background | `--cmux-sidebar` | `#1E1E1E` |
| Pane header | Hardcoded `#1a1a1a` | PaneTabBar background |
| Active indicator | `--cmux-accent` | Tab underline, focus outline |
| Notification dot | `#ff3b30` (iOS red) | Pane notification badge |
| Hover states | `rgba(255, 255, 255, 0.08)` | Button/tab hover |
| Active tab bg | `rgba(255, 255, 255, 0.06)` | Selected tab in PaneTabBar |
| Pill background | `rgba(255, 255, 255, 0.18)` | `.cmux-pill` class |
| Focus outline | `rgba(10, 132, 255, 0.5)` | Active pane border |
| Flash border | `var(--cmux-accent)` | 3px solid on flash animation |

## Workspace Colors

6 rotating colors assigned to new workspaces:

```typescript
["#89b4fa", "#a6e3a1", "#f9e2af", "#f38ba8", "#94e2d5", "#f5c2e7"]
```

Cycle: workspace index `% 6`.

## xterm.js Hard-coded Overrides

```css
.xterm             { padding: 2px 4px 0; background: #0a0a0a; }
.xterm-viewport    { overflow-y: hidden !important; background: #0a0a0a !important; }
.xterm-screen      { image-rendering: pixelated; background: #0a0a0a; }
```

These override xterm's defaults for sharper rendering in WebKitGTK (Tauri's Linux webview).
