# Component Patterns

## Pill Badge (`.cmux-pill`)

Capsule-shaped inline badge for counts and labels.

```css
.cmux-pill {
  background: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.9);
  border-radius: 9999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

Used for: notification counts in sidebar tabs.

## Pane Action Button (`.pane-action-btn`)

Transparent icon button that appears in pane headers.

```css
.pane-action-btn {
  background: none;
  border: none;
  color: var(--cmux-text-tertiary);  /* 0.3 opacity at rest */
  cursor: pointer;
  padding: 3px;
  border-radius: 3px;
  transition: color 0.1s, background 0.1s;
}
.pane-action-btn:hover {
  color: var(--cmux-text);
  background: rgba(255, 255, 255, 0.08);
}
```

Used for: split-right, split-down, close pane, close tab, add tab, browser tab.

## Tab Pattern (PaneTabBar)

Each tab in the pane header:

| State | Background | Border-bottom | Text color |
|-------|-----------|---------------|------------|
| Inactive | transparent | 2px transparent | `--cmux-text-secondary` |
| Active | `rgba(255,255,255,0.06)` | 2px `--cmux-accent` | `--cmux-text` |

- Height: 36px, max-width: 160px, text overflow: ellipsis
- Close button (×) only shown when pane has >1 tab
- Folder icon color: accent when active, tertiary when not
- Notification dot: 5px red circle, only on active tab with notifications

## Sidebar Tab (TabItem)

Workspace tabs in the sidebar:

- Close button (`.tab-close-btn`): hidden by default, shown on parent hover via CSS
- Color indicator: workspace color stripe on left edge
- Metadata: notification count pill + last log line preview

```css
div:hover > .tab-close-btn {
  opacity: 1 !important;
}
```

## Terminal Pane Container

```
┌─ PaneTabBar (36px) ──────────────────────────┐
│ [icon] label  [icon] label  │ [+] [🌐] [⊞] [×] │
├──────────────────────────────────────────────┤
│                                              │
│  XTermWrapper (flex: 1)                      │
│  ├── xterm.js Terminal                       │
│  └── WebGL canvas                            │
│                                              │
│  [↺ Restart] (shown on process exit)         │
└──────────────────────────────────────────────┘
```

Focus states:
- Active pane: `outline: 1px solid rgba(10, 132, 255, 0.5)` with 0.15s transition
- Inactive pane: `outline: 1px solid transparent`
- Flash overlay: 3px accent border with `paneFlash` animation (0.9s)

## Split Pane Grid (Allotment)

```css
:root {
  --sash-size: 1px !important;  /* collapsed from default 8px */
}

[class*="sash"] {
  background: transparent !important;
  transition: background 0.15s;
}
[class*="sash"]:hover {
  background: var(--cmux-accent) !important;
}
```

Sash is invisible at rest; shows accent-colored 1px resize handle on hover.

## Sidebar Layout

```
width: sidebarCollapsed ? 0 : 200px
overflow: hidden
flexShrink: 0
transition: width 0.2s ease
```

Sidebar is always mounted (never unmounted) to avoid terminal remount. Width animates to 0 when collapsed.

Toggle: sidebar collapse button (visible when collapsed) or `Ctrl+B`.
