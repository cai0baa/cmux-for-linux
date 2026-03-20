# Performance Optimization Plan

## P1 — Store Subscription Cascade (CRITICAL) [DONE]
**Problem**: `updatePaneMetadata` in workspaceStore spreads entire workspaces array every 2s per session, triggering re-renders in AppShell, TabBar, TitleBar, NotificationPanel.

**Fix**: Moved cwd/gitBranch/processTitle into `usePaneMetadataStore`. Removed `updatePaneMetadata` from workspace store. Added diff-check in `setMetadata` to skip no-op updates.

**Files**: workspaceStore.ts, App.tsx, TabBar.tsx, PaneTabBar.tsx, TerminalPane.tsx, useWorkspacePersist.ts

## P2 — Metadata Polling Overhead (HIGH) [DONE]
**Problem**: monitor.rs polls every 2s, spawns `git rev-parse` for every session.

**Fix**: Already had CWD-based git caching. Added diff-based emission (only emits when metadata actually changed). Added process_name capture from /proc/{pid}/task/{pid}/children.

**Files**: src-tauri/src/pty/monitor.rs

## P3 — Notification Count Cascade (HIGH) [DONE]
**Problem**: `incrementNotification` on every terminal write triggers store updates cascading to 4+ components.

**Fix**: Already throttled at 500ms in XTermWrapper. Added diff-check in `setMetadata` to prevent no-op updates from triggering re-renders.

**Files**: workspaceStore.ts, XTermWrapper.tsx

## P4 — Keyboard Listener Re-attachment (MODERATE) [DONE]
**Problem**: AppShell useEffect with large dependency array re-attaches keyboard listeners on every state change.

**Fix**: Used refs (`stateRef`) for rapidly-changing values (workspaces, activeId, activePaneId). useEffect dependency array now only includes stable function references.

**Files**: AppShell.tsx

## P5 — Missing Memoization (MODERATE) [DONE]
**Problem**: Various computed values recreated every render.

**Fix**:
- `TerminalGrid` — wrapped with `React.memo`, `paneMap` memoized with `useMemo`
- `WorkspaceView` — wrapped with `React.memo`
- `NotificationPanel` — notification list memoized with `useMemo`
- `TerminalPane` — already was `memo`

**Files**: TerminalGrid.tsx, WorkspaceView.tsx, NotificationPanel.tsx

## Acceptance Criteria
- [ ] Open 4+ panes, run high-output commands — UI remains responsive
- [ ] Switching tabs and clicking sidebar shows no lag
- [ ] React DevTools Profiler shows minimal unnecessary re-renders
