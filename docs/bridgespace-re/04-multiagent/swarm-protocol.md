# BridgeSwarm Multi-Agent Protocol

**This is the highest-value finding for ptrcode implementation.**

## Protocol Summary

BridgeSwarm's multi-agent coordination is entirely local and does not require a cloud service.
It uses three components working together:

| Component | Type | Purpose |
|-----------|------|---------|
| `SWARM_BOARD.md` | Markdown file | Persistent shared state between all agents |
| `bs-mail` | CLI tool | Real-time message passing between agent roles |
| Port 7242 service | HTTP + WebSocket | Agent status, task queue, coordination events |

## Component 1: SWARM_BOARD.md

A markdown file written to the project directory (or a temp directory for the session).
All agents in a swarm session read and write this file to share state.

**Inferred structure** (from screenshots + binary analysis):
```markdown
# Swarm Board

## Active Task
[Current task description]

## Agent Roles
- Builder: [current agent ID / pane ID]
- Reviewer: [current agent ID / pane ID]
- Scout: [current agent ID / pane ID]

## Progress
- [ ] Step 1
- [x] Step 2 (completed by Builder)
- [ ] Step 3

## Messages
[Timestamped log of inter-agent communications]
```

**Why this works**: Claude Code and other AI agents are instructed to read and update this file
as part of their system prompt (injected via CLAUDE.md). The file serves as shared working memory.

## Component 2: bs-mail CLI

A CLI tool that provides real-time messaging between agent panes.

**Usage** (inferred from screenshots and binary strings):
```bash
bs-mail send --to reviewer "Task complete, ready for review"
bs-mail send --to all "Build failed at step 3"
bs-mail inbox                    # check messages for current role
bs-mail watch                    # stream incoming messages
```

**Implementation**: Almost certainly a thin wrapper around the port 7242 WebSocket API.
The CLI connects to the local service, sends/receives messages, and formats them for terminal display.

**ptrcode equivalent**: `ptr-mail` — same interface, connects to `ptrd` daemon.

## Component 3: Port 7242 Local Service

A local HTTP + WebSocket server running inside the Tauri backend process.

**HTTP endpoints** (inferred from CSP and binary patterns):
```
GET  /agents                     → list active agents + status
POST /agents/:id/message         → send message to agent
GET  /tasks                      → current task queue
POST /tasks                      → add task to queue
GET  /board                      → current SWARM_BOARD.md content
PUT  /board                      → update SWARM_BOARD.md
```

**WebSocket** (`ws://127.0.0.1:7242/events`):
- Real-time stream of agent status changes
- New messages arriving in agent inboxes
- Task queue updates
- Frontend subscribes to this for the swarm dashboard

## Role Injection via CLAUDE.md / GEMINI.md

When a swarm session is started, BridgeSpace writes a per-pane `CLAUDE.md` (or `GEMINI.md`)
into the working directory for each agent pane. This file contains:

1. The agent's assigned role (Builder, Reviewer, Scout)
2. Instructions for using the coordination tools:

```markdown
# Agent Role: Builder

You are the Builder agent in a BridgeSwarm session.

## Coordination Protocol
- Use `SWARM_BOARD.md` for persistent state — read it at the start of every task,
  update it when you complete steps.
- Use `bs-mail` for real-time communication with other agents:
  - `bs-mail send --to reviewer "ready for review"`
  - `bs-mail inbox` to check messages
- Do not modify files assigned to other agents without coordination.

## Your Current Task
[Injected from task queue]
```

**Evidence**: Screenshot from a BridgeSwarm session showed injected prompt text including:
> "Use SWARM_BOARD for persistent state and bs-mail for real-time coordination"

## Confirmed Agent Roles (from screenshots)

| Role | Responsibility |
|------|---------------|
| **Builder** | Implements the feature/task |
| **Reviewer** | Reviews Builder output, approves or requests changes |
| **Scout** | Explores codebase, gathers context, reports findings |
| *(Orchestrator)* | Implied — the human or a dedicated agent assigning tasks |

## Dynamic Loading (No Hardcoded Swarm Logic)

Binary analysis of all three platforms found **no hardcoded swarm role strings** in the main binary.
This confirms the swarm configuration is loaded dynamically at runtime from:
- SWARM_BOARD.md
- CLAUDE.md / GEMINI.md (written by the app at session start)
- Port 7242 service state

The binary only contains the coordination infrastructure — the actual role definitions and
task content are runtime artifacts.

## ptrcode Implementation Mapping

| BridgeSpace | ptrcode equivalent | Status |
|-------------|-------------------|--------|
| `SWARM_BOARD.md` | `SWARM_BOARD.md` (identical) | Planned |
| `bs-mail` CLI | `ptr-mail` CLI | Planned |
| Port 7242 service | `ptrd` daemon (TCP or Unix socket) | Planned |
| CLAUDE.md injection | Swarm wizard → writes CLAUDE.md per pane | Planned |
| Swarm dashboard UI | Agent coordination view in sidebar | Planned |
| Role assignment wizard | "New Swarm" dialog | Planned |

## Why This Architecture Is Correct

- **No cloud dependency**: works offline, no API keys needed for coordination
- **Agent-agnostic**: any LLM CLI (Claude Code, Gemini, GPT-4o via opencode) can read markdown
- **Debuggable**: SWARM_BOARD.md is human-readable, you can inspect state at any time
- **Recoverable**: if one agent crashes, the board state survives — new agent can resume
- **Extensible**: add new roles by writing a new CLAUDE.md template — no backend changes needed
