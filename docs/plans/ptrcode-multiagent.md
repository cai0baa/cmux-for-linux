# ptrcode — Multi-Agent Architecture Plan

**Date**: 2026-03-20
**Status**: Design (pre-implementation)
**Product**: ptrcode (rename of ptrterminal)

---

## Vision

Two embedded modes in a single cross-platform desktop app:

| Mode | Name | What it does |
|------|------|--------------|
| **Workspace** | ptrcode Workspace | Terminal multiplexer — split panes, browser pane, full control. Equivalent to BridgeSpace. |
| **Swarm** | ptrcode Swarm | Fully delegated multi-agent execution — you give the goal, agents coordinate and ship. Equivalent to BridgeSwarm. |

Target market: Brazilian developers. No localized competitor exists.

---

## What BridgeSwarm Actually Does (reverse-engineered)

From binary analysis of `BridgeSpace.deb` and video screenshots:

**Stack**: Tauri + React + `portable-pty` + `webkit2gtk` — **identical to our stack**.
They use `webkit2gtk` on Linux too, `tauri-runtime-wry-2.10.0`. No Electron, no separate per-OS implementation.

**Swarm coordination protocol** (from injected prompt visible in terminal):
1. **`SWARM_BOARD.md`** — a markdown file written into the project directory. Shared persistent state. Every agent reads it on start and updates their section when they complete tasks.
2. **`bs-mail`** — a small CLI tool installed by BridgeSpace. Agents call it to send messages: `bs-mail send @coordinator "task complete"`. Messages are relayed through the app's socket and displayed in the console panel.
3. **CLAUDE.md / GEMINI.md injection** — when a swarm launches, the app writes a role-specific `CLAUDE.md` into the project dir (or injects via PTY). Contains: mission brief, assigned role (Coordinator/Builder/Scout/Reviewer), and instructions to use `SWARM_BOARD` + `bs-mail`.

**Swarm creation wizard (5 steps)**:
1. Name your swarm
2. Choose directory (browse or `cd` command)
3. Swarm prompt (mission brief, shared with all agents)
4. Knowledge (attach context files: PDFs, logs, specs)
5. Agent roster (presets: 5/10/15/20/50 agents; CLI: Claude/Codex/Gemini/OpenCode/Cursor; roles per agent: Coordinator/Builder/Scout/Reviewer/Custom)

**Swarm dashboard**:
- Canvas view: agent cards grouped by role (Coordinators / Builders / Reviewers / Scouts)
- Each card: agent number, role badge, status (Starting/Working/Done/Error), last action
- Top bar: mission statement, active/done/error counts, Terminals button, Stop All
- Right panel: Console (message log from `bs-mail`) + message input box + Add Agent button

**Roles**:
- **Coordinator** — reads SWARM_BOARD, assigns tasks to builders/scouts via bs-mail, collects results, reports to operator
- **Builder** — implements assigned tasks, updates SWARM_BOARD section, reports done via bs-mail
- **Scout** — explores codebase, maps architecture, writes findings to SWARM_BOARD
- **Reviewer** — reviews diffs, writes feedback to SWARM_BOARD reviewer section, reports via bs-mail
- **Custom** — user-defined role with custom prompt

---

## Framework Decision: Stay on Tauri

**BridgeSpace uses the same stack we do**: Tauri + webkit2gtk on Linux, no Electron.

Electron comparison:
| | Tauri | Electron |
|--|-------|----------|
| Binary size | ~8MB | ~150MB |
| Memory | ~50MB | ~200MB+ |
| Cross-platform browser pane | Platform-specific (same problem) | Chromium everywhere (solves it) |
| Rewrite cost | Zero | Full rewrite |

**Verdict**: Stay on Tauri. Don't migrate to Electron. The cross-platform browser pane problem exists in both — Electron just gives you Chromium instead of WebKit, but embedding it in a window is the same complexity.

---

## Cross-Platform Migration Plan

### What's already cross-platform (zero changes needed)
- All frontend (React, xterm.js, Zustand)
- PTY (`portable-pty` is cross-platform)
- Socket API (`src-tauri/src/socket.rs` — Unix socket, needs named pipe for Windows only)
- Swarm coordination (file I/O + PTY injection — fully portable)
- Terminal config detection (needs path adjustments for macOS/Windows, already partially done)

### What's Linux-only (needs per-platform work)
| Component | Linux | macOS | Windows | Effort |
|-----------|-------|-------|---------|--------|
| Browser pane container | `gtk::Overlay` + `gtk::Fixed` | `NSView` subview | `HWND` + WebView2 | High per platform |
| GTK init in `lib.rs` | `gtk::init()` | Not needed | Not needed | Low |
| `webkit2gtk` dep | Direct dep | Not needed | Not needed | Low |

### Phase 1: Swarm mode first (cross-platform, no browser needed)
Build Swarm mode entirely — it has zero dependency on GTK or webkit. Ships cross-platform from day one.

### Phase 2: Isolate browser pane behind feature flags
```rust
#[cfg(target_os = "linux")]
mod browser_linux; // current gtk implementation

#[cfg(target_os = "macos")]
mod browser_macos; // NSView stub → system browser fallback

#[cfg(target_os = "windows")]
mod browser_windows; // WebView2 stub → system browser fallback
```
Workspace mode works on macOS/Windows with "open in system browser" fallback. Full embedded browser comes later.

### Phase 3: Native browser pane per platform (future)
- macOS: `WKWebView` via `objc2` crate
- Windows: `webview2-com` crate

---

## Swarm Implementation Architecture

### New components needed

**Rust (`src-tauri/src/`)**:
- `swarm/mod.rs` — Swarm state machine (creating, running, stopped)
- `swarm/board.rs` — SWARM_BOARD.md read/write operations
- `swarm/mail.rs` — bs-mail equivalent: message relay through socket to frontend
- `swarm/roles.rs` — Role definitions and CLAUDE.md/GEMINI.md template generation
- `swarm/launcher.rs` — Spawn agents into PTY sessions with injected context

**Frontend (`src/`)**:
- `components/swarm/SwarmWizard.tsx` — 5-step creation wizard
- `components/swarm/SwarmDashboard.tsx` — Canvas + console panel
- `components/swarm/AgentCard.tsx` — Individual agent status card
- `components/swarm/SwarmConsole.tsx` — Message log panel
- `stores/swarmStore.ts` — Swarm state (agents, messages, status)
- `lib/swarmTemplates.ts` — Role-specific CLAUDE.md/GEMINI.md templates

**CLI tool (`ptrcode-mail`)**:
- Small standalone binary installed to `~/.local/bin/ptrcode-mail` (or `~/AppData/Local/ptrcode/ptrcode-mail.exe`)
- Agents call: `ptrcode-mail send @coordinator "message"`
- Connects to `~/.ptrcode/ptr.sock`, sends JSON, gets ack
- Must be installed as part of app setup

### SWARM_BOARD.md format
```markdown
# SWARM_BOARD — [Swarm Name]
**Mission**: [prompt]
**Started**: [timestamp]

## Coordinator
- Status: [working|waiting|done]
- Current task: [...]

## Builders
### Builder 2
- Status: [...]
- Assigned: [task description]
- Completed: [list]

### Builder 3
...

## Scouts
### Scout 4
- Status: [...]
- Findings: [...]

## Reviewers
### Reviewer 5
- Status: [...]
- Review notes: [...]
```

### Role injection (CLAUDE.md template example)
```markdown
# Your Role: Builder

**Mission**: {{swarm_prompt}}
**Your name**: Builder {{agent_number}}

## Coordination
- Check SWARM_BOARD.md before starting any task
- Update your section in SWARM_BOARD.md when you complete tasks
- Use `ptrcode-mail send @coordinator "message"` to report progress
- Use `ptrcode-mail send @all "message"` to broadcast

## Instructions
1. Read SWARM_BOARD.md to see your assigned tasks
2. Implement your assigned task
3. Update SWARM_BOARD.md → Builders → Builder {{agent_number}} section
4. Run `ptrcode-mail send @coordinator "Builder {{agent_number}} done: [summary]"`

## IMPORTANT
- Do not work outside your assigned task
- Always check SWARM_BOARD.md before starting
- Use git worktree if told to work in isolation
```

---

## App Mode Selection (Home Screen)

On launch or new workspace: show mode picker (like BridgeSpace):

```
┌─────────────────────────────────────────────────┐
│              ptrcode                             │
│         Build the future.                       │
│                                                  │
│  ┌──────────────────┐  ┌──────────────────────┐ │
│  │  Workspace  ⌘T   │  │  Swarm  ⌘S           │ │
│  │                  │  │                      │ │
│  │  Split panes,    │  │  Give a goal.        │ │
│  │  browser pane,   │  │  Agents coordinate   │ │
│  │  full control.   │  │  and ship the code.  │ │
│  └──────────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## Build Order

1. **Rebrand**: rename `ptrterminal` → `ptrcode` (package.json, tauri.conf.json, socket path, binary name)
2. **Swarm wizard UI** — 5-step creation flow (no backend yet, just UI)
3. **SWARM_BOARD.md generator** — Rust: write/read board file
4. **`ptrcode-mail` CLI** — small Rust binary, connects to socket, sends JSON message
5. **Socket → console relay** — extend socket.rs to support named channels (swarm messages)
6. **Role template injection** — write CLAUDE.md/GEMINI.md on swarm launch
7. **Swarm dashboard** — canvas + console panel
8. **Agent status parsing** — already partially done (agentStatus in metadata store)
9. **Cross-platform compile** — add `#[cfg]` guards around GTK code, test macOS/Windows builds
10. **ptrcode-mail installer** — include binary in app bundle, install to PATH on first run

---

## Competitive Position vs BridgeSpace

| Feature | BridgeSpace | ptrcode |
|---------|------------|---------|
| Workspace mode | ✅ macOS-first | ✅ Linux-first |
| Swarm mode | ✅ Commercial | 🔨 Building |
| Browser pane | ✅ All platforms | ✅ Linux; stubs elsewhere |
| Open source | ❌ | ✅ (differentiator) |
| Brazil market | ❌ Not targeted | ✅ Primary market |
| Pricing in BRL | ❌ | ✅ |
| Agent CLI support | Claude/Codex/Gemini/OpenCode/Cursor | Same |
| Auth/licensing | Cloud-based | TBD |
