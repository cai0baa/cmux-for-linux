# UI: Per-Pane Tab Metadata (cmux-style)

## Goal
Each tab in PaneTabBar shows relevant terminal info — current process name, terminal title, or cwd basename as fallback.

## Changes [DONE]

### Frontend
- `XTermWrapper.tsx` — Added `term.onTitleChange()` listener to capture terminal title escape sequences, stores in paneMetadataStore as `processTitle`
- `PaneTabBar.tsx` — Now reads `processTitle` and `cwd` from paneMetadataStore instead of from pane props. Tab label priority: explicit label > processTitle > cwd basename > agent name

### Backend
- `monitor.rs` — Added foreground process name capture via `/proc/{pid}/task/{pid}/children` → `/proc/{child_pid}/comm`. Falls back to shell process name.
- `PtyMetadata` struct — Added `process_name: Option<String>` field
- `ipc.ts` — Added `process_name` to PtyMetadata interface
- `App.tsx` — Routes `process_name` to paneMetadataStore as `processTitle`

### Store
- `workspaceStore.ts` — Extended `PaneMetadata` interface with `cwd`, `gitBranch`, `processTitle` fields

## Acceptance Criteria
- [ ] Open terminal, run `vim` → tab shows "vim" or file being edited
- [ ] cd to directory → tab shows directory name as fallback
- [ ] Multiple tabs show distinct metadata
- [ ] Terminal title set via escape sequences (e.g. by zsh/fish) reflected in tab
