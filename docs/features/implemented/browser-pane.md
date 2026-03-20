# Browser Pane

## Overview

A lightweight embedded browser using an HTML `<iframe>` with a URL bar. Added as a tab type (`type: "browser"`) within any pane.

## Component: `BrowserPane.tsx`

### URL Bar
- Input field with monospace font (12px)
- Auto-prepends `https://` if no protocol specified
- Navigate on Enter key

### Navigation Controls
- **Back** (`‹`): `iframe.contentWindow.history.back()`
- **Forward** (`›`): `iframe.contentWindow.history.forward()`
- **Refresh** (`↻`): Sets src to `about:blank` then restores (forces reload)

### Empty State
Shows centered globe icon (🌐) with "Enter a URL above to browse" when URL is `about:blank`.

## How to Open

1. Click the globe icon (🌐) in any pane's `PaneTabBar`
2. Creates a new tab with `type: "browser"` via `addTabToPane(workspaceId, paneId, undefined, "browser")`

## Iframe Sandbox

```html
<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
```

## Limitations

- **Cross-origin restrictions**: Back/forward buttons silently fail on cross-origin navigations
- **No DevTools**: No way to inspect the iframe content
- **No cookies/persistence**: Browser state is lost on tab close
- **Many sites blocked**: Sites with `X-Frame-Options: DENY` won't load
- **No address bar sync**: URL bar doesn't update on iframe navigation

## Future

See [rich-browser.md](../pending/rich-browser.md) for the planned upgrade using Tauri webview APIs to bypass iframe limitations.
