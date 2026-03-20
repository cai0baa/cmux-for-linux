# Animations & States

## Keyframe Animations

### Pane Flash (`@keyframes paneFlash`)

```css
@keyframes paneFlash {
  0%   { opacity: 0; }
  15%  { opacity: 1; }
  40%  { opacity: 0.3; }
  65%  { opacity: 1; }
  100% { opacity: 0; }
}
```

- Duration: 0.9 seconds
- Easing: `ease-out`
- Applied to: absolute-positioned overlay div with 3px accent border
- Trigger: `Ctrl+Shift+H` or programmatic `triggerFlash(sessionId)`
- Cleanup: `setTimeout(900ms)` removes pane from `flashingPaneIds` set

## Transitions

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Pane action button | color, background | 0.1s | default |
| Pane focus outline | outline | 0.15s | default |
| Sidebar width | width | 0.2s | ease |
| Split sash hover | background | 0.15s | default |
| Tab background | background | 0.1s | default |

## Interactive States

### Pane Action Buttons

| State | color | background |
|-------|-------|-----------|
| Rest | `--cmux-text-tertiary` (0.3) | none |
| Hover | `--cmux-text` (0.9) | `rgba(255,255,255,0.08)` |
| Active | (inherits hover) | (inherits hover) |

### Terminal Pane

| State | Visual |
|-------|--------|
| Inactive | 1px transparent outline |
| Active (focused) | 1px `rgba(10, 132, 255, 0.5)` outline |
| Has notification | Red border-bottom on PaneTabBar (1px `rgba(255, 59, 48, 0.5)`) |
| Flashing | 3px accent border overlay with paneFlash animation |
| Process exited | Yellow `[Process exited]` text + floating "↺ Restart" button |

### Sidebar Tab

| State | Visual |
|-------|--------|
| Inactive | Close button hidden (opacity: 0) |
| Hover | Close button appears (opacity: 1) |
| Active | Highlighted background (varies by component) |

### PaneTabBar Tab

| State | Visual |
|-------|--------|
| Inactive tab | Transparent bg, muted text, transparent bottom border |
| Active tab | Subtle white bg, full text, accent bottom border |
| Notification | Red dot (5px) on active tab |

### Split Sash

| State | Visual |
|-------|--------|
| Rest | Transparent (invisible 1px) |
| Hover | `--cmux-accent` colored bar |

## Disabled/Loading

Currently no explicit disabled states or loading skeletons are implemented.
The app renders a solid `#0a0a0a` div until `ready` state is true (see `App.tsx`).

## Motion Preferences

No `prefers-reduced-motion` support currently. See [accessibility-and-motion.md](../features/pending/accessibility-and-motion.md) for planned implementation.
