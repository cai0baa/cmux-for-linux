# Workspaces & Layout

## Workspace Model

```typescript
interface Workspace {
  id: string;
  name: string;
  gridTemplateId: GridTemplateId;   // "1x1" | "2x1" | ... | "4x4"
  panes: Pane[];
  status: "setup" | "running" | "stopped";
  createdAt: number;
  color?: string;                   // auto-assigned from 6-color palette
  splitRows?: string[][];           // dynamic split tracking
}
```

## Grid Templates

| ID | Layout | Pane Count |
|----|--------|-----------|
| `1x1` | Single pane | 1 |
| `2x1` | 2 columns | 2 |
| `1x2` | 2 rows | 2 |
| `2x2` | 2×2 grid | 4 |
| `3x2` | 3 columns × 2 rows | 6 |
| `2x3` | 2 columns × 3 rows | 6 |
| `3x3` | 3×3 grid | 9 |
| `4x4` | 4×4 grid | 16 |

Template selected during workspace creation via `GridPicker` component.

## Split Layout (Allotment)

`TerminalGrid` uses nested `<Allotment>` components:

```
Allotment (vertical) — rows
  └── Allotment.Pane × N
      └── Allotment (horizontal) — columns per row
          └── Allotment.Pane × M
              └── TerminalPane
```

Two layout modes:
1. **Template layout**: Panes arranged by grid template (rows × cols)
2. **Dynamic layout**: When `splitRows` exists or pane count exceeds template — uses `splitRows` array for freeform arrangements

## Dynamic Splitting

`addPaneToWorkspace(workspaceId, afterPaneId, direction)`:

- **Split right**: Inserts new pane ID after target in its row
- **Split down**: Inserts new row after the row containing target

`splitRows` is a `string[][]` where each inner array is a row of pane IDs.

## Tab-per-Pane Model

Each pane supports multiple tabs:

```typescript
interface Pane {
  tabs: PaneTab[];         // ordered list of tabs
  activeTabId: string;     // currently visible tab
  sessionId: string;       // active tab's session (kept for compat)
}

interface PaneTab {
  id: string;
  sessionId: string;
  agentId: string;
  type?: "terminal" | "browser";
}
```

Tab actions:
- **Add tab**: `onAddTab(agentId, type)` — creates new PTY or browser
- **Close tab**: removes tab; if last tab, removes entire pane
- **Switch tab**: sets `activeTabId`, all tabs stay mounted (hidden via `display: none`)

## Workspace Lifecycle

1. **Create**: `WorkspaceSetup` modal → choose name, grid, agent assignments → `createWorkspace()`
2. **Run**: Panes spawned, PTY sessions created on mount
3. **Close**: `handleCloseWorkspace()` kills all PTY sessions → `removeWorkspace()`

## Workspace Colors

6 rotating colors: `#89b4fa`, `#a6e3a1`, `#f9e2af`, `#f38ba8`, `#94e2d5`, `#f5c2e7`.
Auto-assigned by `workspaces.length % 6`, or user-provided.
