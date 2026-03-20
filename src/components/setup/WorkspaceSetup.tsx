import { useState } from "react";
import type { GridTemplateId } from "../../types";
import { getGridTemplate } from "../../lib/gridTemplates";
import GridPicker from "./GridPicker";
import AgentSlotList from "./AgentSlotList";

const COLOR_PALETTE = ["#89b4fa", "#a6e3a1", "#f9e2af", "#f38ba8", "#94e2d5", "#f5c2e7"];

interface WorkspaceSetupProps {
  onLaunch: (
    name: string,
    gridTemplateId: GridTemplateId,
    agentAssignments: Record<number, string>,
    color?: string,
  ) => void;
  onCancel: () => void;
}

export default function WorkspaceSetup({ onLaunch, onCancel }: WorkspaceSetupProps) {
  const [name, setName] = useState("");
  const [gridId, setGridId] = useState<GridTemplateId>("2x2");
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);

  const template = getGridTemplate(gridId);

  function handleLaunch() {
    const wsName = name.trim() || `Workspace ${Date.now() % 10000}`;
    onLaunch(wsName, gridId, assignments, selectedColor);
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#0a0a0a",
      }}
    >
      <div
        style={{
          width: 420,
          background: "#141414",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            fontSize: 14,
            color: "#ededed",
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
          }}
        >
          New Workspace
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              color: "#a3a3a3",
              marginBottom: 6,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Name
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Workspace"
            onKeyDown={(e) => e.key === "Enter" && handleLaunch()}
            style={{
              width: "100%",
              background: "#1a1a1a",
              color: "#ededed",
              border: "1px solid #2a2a2a",
              borderRadius: 4,
              padding: "6px 10px",
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              color: "#a3a3a3",
              marginBottom: 6,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Color
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(selectedColor === c ? undefined : c)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: c,
                  border: selectedColor === c ? "2px solid #ffffff" : "2px solid transparent",
                  cursor: "pointer",
                  padding: 0,
                  outline: "none",
                  boxShadow: selectedColor === c ? `0 0 0 1px ${c}` : "none",
                }}
                title={c}
              />
            ))}
          </div>
        </div>

        <GridPicker selected={gridId} onSelect={setGridId} />
        <AgentSlotList
          paneCount={template.paneCount}
          assignments={assignments}
          onChange={setAssignments}
        />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: 4,
              color: "#a3a3a3",
              padding: "6px 16px",
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            style={{
              background: "#89b4fa",
              border: "none",
              borderRadius: 4,
              color: "#0a0a0a",
              padding: "6px 16px",
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Launch
          </button>
        </div>
      </div>
    </div>
  );
}
