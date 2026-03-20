# UI: TitleBar Redesign (cmux-style)

## Goal
`[Sidebar] [Bell] [+]  ·····  TERMINAL · my-workspace  ·····  [—] [X]`

## Changes [DONE]
- Left group (fixed minWidth): Sidebar toggle, Bell/notifications, Plus (new workspace)
- Center (flex: 1, centered, drag region): "TERMINAL · WorkspaceName"
- Right group (fixed minWidth, matching left): Minimize, Close
- Both side groups have matching `minWidth` for true centering
- Added `onNewWorkspace` prop to TitleBar, passed from AppShell

## Files Modified
- `src/components/layout/TitleBar.tsx` — Full layout restructure
- `src/components/layout/AppShell.tsx` — Pass onNewWorkspace prop

## Acceptance Criteria
- [x] Icons match layout: [sidebar] [bell] [+] ... TERMINAL · name ... [—] [X]
- [ ] Sidebar toggle, notifications, new workspace all functional
- [ ] Drag region works for window movement on center area
