import AgentSelector from "./AgentSelector";

interface AgentSlotListProps {
  paneCount: number;
  assignments: Record<number, string>;
  onChange: (assignments: Record<number, string>) => void;
}

export default function AgentSlotList({ paneCount, assignments, onChange }: AgentSlotListProps) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: "#a3a3a3",
          marginBottom: 8,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        Agents ({paneCount} panes)
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {Array.from({ length: paneCount }, (_, i) => (
          <AgentSelector
            key={i}
            slotIndex={i}
            value={assignments[i] ?? "shell"}
            onChange={(agentId) => onChange({ ...assignments, [i]: agentId })}
          />
        ))}
      </div>
    </div>
  );
}
