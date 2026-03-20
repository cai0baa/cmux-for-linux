# Notifications

## How Notifications Are Generated

Terminal output triggers notifications when:
1. `term.onWriteParsed()` fires (xterm.js finished parsing output)
2. Throttled to 500ms intervals
3. Last non-empty line is extracted from terminal buffer
4. If the line changed AND the pane is NOT active → `incrementNotification(sessionId)`

```typescript
// Simplified flow
term.onWriteParsed(() => {
  // 500ms throttle
  const lastLine = extractLastLine(term.buffer);
  if (lastLine !== previousLine && activePaneId !== sessionId) {
    paneMetadataStore.incrementNotification(sessionId);
    paneMetadataStore.setMetadata(sessionId, { lastLogLine: lastLine });
  }
});
```

## Notification Store

```typescript
interface PaneMetadataState {
  metadata: Record<string, {
    lastLogLine?: string;
    notificationCount?: number;
  }>;
  flashingPaneIds: Set<string>;
}
```

Actions:
- `incrementNotification(sessionId)` — bump count by 1
- `clearNotification(sessionId)` — reset to 0
- `setMetadata(sessionId, data)` — update last log line

## Badge Display

**Sidebar tabs** (`TabBar`): Aggregated notification count across all panes in a workspace, displayed as a pill badge. Also shows the most recent `lastLogLine` as a preview.

**Pane tab bar** (`PaneTabBar`): Red border-bottom when `hasNotification` is true. Red dot (5px circle) on active tab with notifications.

## Notification Clearing

Notifications are cleared when a pane receives focus:

```typescript
const handleFocus = () => {
  setActivePaneId(pane.sessionId);
  clearNotification(pane.sessionId);
};
```

## Flash / Attention

Visual flash animation on a pane for 0.9 seconds:

```typescript
triggerFlash(sessionId) → {
  flashingPaneIds.add(sessionId);
  setTimeout(900ms, () => flashingPaneIds.delete(sessionId));
}
```

Renders a 3px accent-colored border overlay with `paneFlash` CSS animation.

Triggers:
- `Ctrl+Shift+H` — flash the currently focused pane
- Programmatic via `usePaneMetadataStore.getState().triggerFlash()`

## Suppression

`XTermWrapper` accepts `suppressNotifications` prop. When `true` (pane is active and tab is active), notifications are not generated even when output changes. This prevents the focused terminal from notifying itself.
