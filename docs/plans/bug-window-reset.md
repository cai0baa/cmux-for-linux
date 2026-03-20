# Bug Fix: Window Reset Session Loss

## Problem
Opening a new Tauri window resets all existing terminals to `~`, losing their sessions. Each window gets its own React app + Zustand store, and the second window's `useWorkspacePersist` overwrites Window 1's data.

## Root Cause
`useWorkspacePersist` sees `workspaces.length <= 1` (bootstrap state), rebuilds all workspaces from saved JSON, creates new PTY sessions at `~`, then saves that state globally — overwriting Window 1's active sessions.

## Fix: Leader Election
- Added `bootstrapped: AtomicBool` to `AppState` in `lib.rs`
- Added `claim_leader()` Tauri command — first caller wins, returns `true`; subsequent callers get `false`
- Added `get_window_count()` Tauri command for future use
- `useWorkspacePersist` calls `claim_leader()` on mount:
  - Leader: loads persistent data, bootstraps workspaces, owns save subscription
  - Follower: skips bootstrap entirely, mounts with minimal local state
- Save logic only runs from leader window (guarded by `isLeader` ref)

## Files Modified
- `src-tauri/src/lib.rs` — AtomicBool in AppState
- `src-tauri/src/commands/window.rs` — New file with claim_leader and get_window_count
- `src-tauri/src/commands/mod.rs` — Added window module
- `src/lib/ipc.ts` — claimLeader() and getWindowCount() wrappers
- `src/hooks/useWorkspacePersist.ts` — Leader-aware bootstrap and save logic

## Acceptance Criteria
- [x] Open ptrterminal, create workspaces, cd to various dirs
- [ ] Open second window — existing terminals keep their sessions and CWDs
- [ ] Close second window — first window unaffected
- [ ] Close leader window, reopen — persisted state restores correctly
