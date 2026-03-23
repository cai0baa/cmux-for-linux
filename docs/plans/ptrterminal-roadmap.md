# ptrterminal Roadmap — Honest State Assessment

**Date**: 2026-03-20
**Status**: Active

---

## What Was Implemented (v0.1.3)

| Item | Status |
|------|--------|
| Reduced Motion (`prefers-reduced-motion`) | ✅ Already done in `global.css` |
| URL detection → open in browser pane | ✅ Done — WebLinksAddon routes to `handleUrlClick` in TerminalPane |
| Error boundaries on pane tabs | ✅ Done — `ErrorBoundary` wraps each tab content with Retry button |
| Agent status badges (working/waiting/done) | ✅ Done — `agentStatus` in metadata store, parsed from terminal output, pulsing dot in tab bar |
| Cross-platform support (macOS + Windows) | ✅ Done — macOS .dmg and Windows NSIS installer added in v0.1.3 |

---

## Immediate (High value, low effort — do next)

| Item | Files | Notes |
|------|-------|-------|
| Port scanner → browser pane | `src/components/layout/TabBar.tsx`, new hook | Read `/proc/net/tcp`, show listening ports in sidebar, click to open in browser pane at `localhost:PORT` |
| Session restore | `src/hooks/useWorkspacePersist.ts`, `src-tauri/src/` | Save/restore window geometry + pane layout on relaunch. Geometry already persisted; needs pane re-creation |

---

## Short-Term (Medium effort, core differentiation)

| Item | Files | Notes |
|------|-------|-------|
| Git worktree per agent tab | `src/components/workspace/PaneTabBar.tsx`, `src-tauri/src/commands/` | When spawning agent in new tab, offer "isolated worktree" option. Auto-create git worktree, assign branch to pane |
| Sidebar metadata (git branch, process count) | `src/components/layout/TabBar.tsx` | Already have `gitBranch` in metadata store; just needs UI display in sidebar workspace items |
| Actionable notifications | `src/components/layout/TabBar.tsx`, notification system | Click notification → switch to that pane. "Port appeared" → open browser. Currently just count badges |

---

## Longer-Term (Architectural)

| Item | Files | Notes |
|------|-------|-------|
| Agent conversation persistence | New SQLite store, `src-tauri/src/` | Save/restore full agent session history (not just PTY output). Model: OpenCode's approach |
| Workspace templates | `src/lib/gridTemplates.ts`, new UI | Named layouts with agent role assignments: "Code Review", "Parallel Build", "Debug" |
| BridgeSwarm-style role coordination | Socket API + new frontend | Builder/reviewer/scout agents with shared mailbox via existing socket API |

---

## Competitive Context (Why These Items)

ptrterminal's unique position on Linux (open-source, wry browser with privileged JS eval, socket API for agent automation) maps to these differentiators that nobody else has open-source on Linux:

- **Agent workspace isolation** via git worktrees (dmux does this with scripts; ptrterminal can do it natively with visual branch status)
- **Real-time agent observability** — status badges are the first step; port scanner + actionable notifications close the loop
- **Browser pane → agent feedback loop** — agents can navigate to `localhost:3000`, snapshot what rendered, report back. The primitives exist; the workflow needs to be discoverable.
- **Agent conversation persistence** — OpenCode's main moat. Nobody else does it on Linux open-source.

---

## No-Go For Now

- ~~**Multiplatform (macOS/Windows)**~~: ✅ Shipped in v0.1.3. Browser pane is Linux-only for now; core terminal works cross-platform.
- **SSH sessions**: High effort, low differentiation (everyone has SSH clients).
- **i18n**: Premature (~50 strings, low ROI).
- **Light theme**: Low priority; GTK theme integration would be more impactful but also more complex.

---

## Critical Files Reference

| File | Role |
|------|------|
| `src-tauri/src/lib.rs` | GTK setup, BrowserManager init |
| `src-tauri/src/commands/browser.rs` | Browser Tauri commands |
| `src-tauri/src/socket/` | Socket API dispatcher |
| `src/components/browser/BrowserPane.tsx` | Browser pane component |
| `src/components/layout/SocketListener.tsx` | Socket command routing |
| `src/components/terminal/XTermWrapper.tsx` | Terminal, WebLinksAddon, agent status parsing |
| `src/components/workspace/PaneTabBar.tsx` | Tab bar, status badges |
| `src/components/layout/TabBar.tsx` | Sidebar (port scanner + workspace metadata go here) |
| `src/components/layout/AppShell.tsx` | Layout root |
| `src/stores/paneMetadataStoreCompat.ts` | Per-pane metadata including `agentStatus` |
| `src/hooks/useWorkspacePersist.ts` | Workspace persistence |
| `src/global.css` | Animations, reduced motion |
