# Frontend JS Bundle Inventory

Vite-generated chunk names extracted from all three platform binaries. The hash suffix
(e.g., `-C98rhins`) is a Vite content hash — different builds produce different hashes,
but the base name is stable and reveals component identity.

All three platforms had identical bundle names, confirming a single shared frontend build.

## Page-Level Chunks

| Bundle Name | Implied Route | Component Purpose |
|-------------|---------------|------------------|
| `AgentsPage-C98rhins.js` | `/agents` | Agent list, status overview, agent management |
| `KanbanBoard-Qa57MQj4.js` | `/tasks` or `/kanban` | Visual task board (drag-and-drop cards) |
| `SkillsPage-CzDxfMYY.js` | `/skills` | Skill/tool library for agents |
| `PromptsPage-DPhB1dYL.js` | `/prompts` | Prompt template management |
| `SettingsPage-Cknla935.js` | `/settings` | App settings (keybindings, themes, model config) |
| `WelcomeScreen-D4qpTvp7.js` | `/` or `/welcome` | Onboarding / first-run experience |

## Modal/Dialog Chunks

| Bundle Name | Purpose |
|-------------|---------|
| `RunTaskModal-7gzmWYXb.js` | Task execution dialog — likely the "start swarm task" entry point |

## Inferred Application Routes

```
/                    → WelcomeScreen (first run) or workspace
/workspace           → Main workspace (terminal panes, browser, editor)
/agents              → AgentsPage (swarm management)
/tasks or /kanban    → KanbanBoard (task queue visualization)
/skills              → SkillsPage (prompt/skill library)
/prompts             → PromptsPage (prompt templates)
/settings            → SettingsPage
```

## Bundler Identification

- **Bundler**: Vite (confirmed by content-hash naming pattern `name-XXXXXXXX.js`)
- **Framework**: React (component naming conventions, hooks patterns in chunk names)
- **Language**: TypeScript (`.tsx` conventions visible in some string artifacts)
- No Next.js (desktop app, no SSR needed — pure client-side React)

## What This Tells Us About BridgeSpace Feature Set

1. **Kanban board is core** — it has its own lazily-loaded chunk, not inlined into main bundle
2. **Skill/prompt management** — BridgeSpace has a built-in prompt library (like a snippet manager for AI)
3. **Task execution is modal-driven** — `RunTaskModal` suggests tasks are started via a dialog, not inline
4. **Agents are first-class objects** — dedicated `/agents` page for viewing/managing agent sessions
5. **Welcome/onboarding exists** — `WelcomeScreen` chunk implies a first-run flow with setup steps

## Comparison to ptrcode Frontend Plan

| BridgeSpace Page | ptrcode equivalent | Priority |
|-----------------|-------------------|---------|
| AgentsPage | Sidebar agent status + Swarm dashboard | High |
| RunTaskModal | "New Swarm" wizard dialog | High |
| KanbanBoard | Not planned yet | Low |
| SkillsPage | Not planned yet | Low |
| PromptsPage | Not planned yet | Low |
| SettingsPage | Already exists | Done |
| WelcomeScreen | Not planned | Medium |
