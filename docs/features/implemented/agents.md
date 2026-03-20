# Agent System

## Overview

An "agent" is a command definition that determines what process runs in a terminal pane. Each pane tab has an `agentId` that maps to an `AgentDefinition`.

## Built-in Agents

| ID | Name | Command | Icon | Color |
|----|------|---------|------|-------|
| `shell` | Shell | `/bin/bash` | `$` | `#a6e3a1` |
| `claude-code` | Claude Code | `claude` | `C` | `#89b4fa` |
| `codex` | Codex CLI | `codex` | `X` | `#f5c2e7` |
| `gemini` | Gemini CLI | `gemini` | `G` | `#f9e2af` |
| `aider` | Aider | `aider` | `A` | `#94e2d5` |

Defined in `src/lib/agents.ts`.

## AgentDefinition Type

```typescript
interface AgentDefinition {
  id: string;          // unique identifier
  name: string;        // display name
  description: string; // shown in UI
  command: string;     // shell command to launch
  args: string[];      // command arguments
  icon: string;        // single char icon
  color: string;       // hex color for pane header accent
}
```

## How Agents Are Used

1. **Workspace creation**: `AgentSelector` + `AgentSlotList` let users assign agents to each pane slot
2. **Tab creation**: `addTabToPane(workspaceId, paneId, agentId)` — agent determines the command spawned
3. **PTY spawn**: `XTermWrapper` receives `command` and `args` from the agent definition
4. **Default**: `getDefaultAgent()` returns `shell` (first in BUILT_IN_AGENTS array)

## Agent Resolution

```typescript
const agent = getAgent(tab.agentId) ?? getDefaultAgent();
// agent.command → passed to createSession()
// agent.args → passed to createSession()
```

If an agent ID doesn't match any built-in, falls back to shell.

## Adding New Agents

Add an entry to `BUILT_IN_AGENTS` array in `src/lib/agents.ts`. No other changes needed — the agent appears in `AgentSelector` automatically.

## Future

Custom user-defined agents (JSON config) are not yet implemented. Currently only the 5 built-in agents are available.
