# ptrcode vs BridgeSpace — Gap Analysis

## Feature Parity Matrix

| Feature | BridgeSpace | ptrcode | Priority |
|---------|-------------|---------|---------|
| Multi-pane terminal | ✅ Full | ✅ Full | Done |
| Browser pane (native WebView) | ✅ All platforms | ✅ Linux only | High |
| Agent status badges | ✅ Real-time | ✅ v0.1.3 | Done |
| URL detection in terminal | ✅ Yes | ✅ v0.1.3 | Done |
| Error boundaries | ✅ Yes | ✅ v0.1.3 | Done |
| Custom keybindings | ✅ Yes | ✅ Yes | Done |
| Multi-agent swarm mode | ✅ BridgeSwarm | ❌ Planned | **Critical** |
| Local coordination daemon | ✅ Port 7242 | ❌ Planned (`ptrd`) | **Critical** |
| `bs-mail` / `ptr-mail` CLI | ✅ Yes | ❌ Planned | **Critical** |
| SWARM_BOARD.md protocol | ✅ Yes | ❌ Planned | **Critical** |
| Role injection (CLAUDE.md) | ✅ Automated | ❌ Planned | **Critical** |
| Swarm wizard UI | ✅ Yes | ❌ Planned | High |
| Cross-platform (macOS/Win) | ✅ All 3 | ❌ Linux only | High |
| Kanban task board | ✅ Full | ❌ Not planned | Low |
| Skills/prompt library | ✅ Yes | ❌ Not planned | Low |
| Voice input (Whisper) | ✅ BridgeVoice | ❌ Future | Low |
| OAuth2 / account system | ✅ Full | ❌ N/A (open source) | N/A |
| Auto-updater | ✅ Yes | ❌ Not planned | Medium |
| Session restore | ❌ Unknown | ❌ Pending | Medium |
| Port scanner | ❌ Unknown | ❌ Pending | Medium |

## ptrcode Differentiators (Advantages Over BridgeSpace)

| Advantage | Details |
|-----------|---------|
| **Open source** | BridgeSpace is closed-source. ptrcode will be MIT licensed. |
| **No subscription** | BridgeSpace requires paid account. ptrcode is free. |
| **Agent-agnostic** | `ptr-mail` works with Claude Code, Gemini CLI, GPT-4o, any LLM CLI |
| **Linux-first quality** | BridgeSpace's Linux version is secondary. ptrcode leads on Linux. |
| **Brazilian market** | Portuguese UI, local community, BRL pricing if monetized |
| **Simpler architecture** | No commercial backend required — fully local swarm |
| **Inspectable protocol** | SWARM_BOARD.md is plain markdown — users can read/edit state |

## Recommended Build Order for ptrcode

### Phase 1: Cross-Platform Foundation (prerequisite for everything)
1. Add `#[cfg(target_os = "linux")]` guards around all GTK/webkit2gtk code in `BrowserManager`
2. Add wry-native fallback for browser pane on macOS/Windows
3. Replace Unix socket with TCP for `ptrd` (works on all platforms)
4. Add macOS `.dmg` and Windows `.msi/.exe` build targets to `tauri.conf.json` + CI

### Phase 2: Swarm Core (highest differentiation)
5. Build `ptrd` daemon — axum-based HTTP + WebSocket server on configurable port (default 7342, avoid conflict with BridgeSpace)
6. Build `ptr-mail` CLI — thin client for ptrd WebSocket, formats output for terminal
7. Swarm wizard UI — dialog to create a new swarm session, assign roles, generate SWARM_BOARD.md
8. Role injection — wizard writes `CLAUDE.md` (and optionally `GEMINI.md`) per agent pane

### Phase 3: Swarm Experience Polish
9. SWARM_BOARD.md live viewer — sidebar panel that watches and renders the board file
10. Agent coordination dashboard — real-time view of agent statuses via ptrd WebSocket
11. Task queue UI — simple list of pending/active/done tasks
12. Notification-to-action for swarm events ("Reviewer approved → merge?")

### Phase 4: Quality & Reach
13. Session restore (pane layout + geometry)
14. Port scanner → click to open in browser pane
15. Auto-updater (tauri-plugin-updater already available)
16. Skills/prompt library (template CLAUDE.md snippets)
17. Portuguese (pt-BR) UI strings

### Phase 5: Future
18. `ptr-voice` (Whisper.cpp voice input)
19. Kanban board view
20. Git worktree per agent tab

## Why Not Copy Everything

BridgeSpace features **not worth replicating**:
- **OAuth2 + commercial backend**: ptrcode is open source — no subscription model needed
- **Device fingerprinting**: invasive, no place in an open-source tool
- **Kanban board**: nice to have, not differentiating — GitHub Projects serves this need
- **Skills page**: low priority — users can manage prompts in files

## Market Positioning

```
BridgeSpace: "Professional AI terminal for teams" — macOS-primary, paid, closed
ptrcode:     "Open multi-agent workspace" — Linux-primary, free, open source

Target user: Brazilian developer running 2-4 Claude Code/Gemini agents on a Linux machine,
             wants to coordinate them without paying $X/month for a macOS-first closed tool.
```
