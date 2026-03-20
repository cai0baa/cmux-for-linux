import { useMemo, useState, useEffect } from "react";
import {
  KEYBINDING_DEFINITIONS,
  formatShortcutLabel,
  shortcutFromKeyboardEvent,
  type KeybindingActionId,
} from "../../lib/keybindings";
import { useKeybindingStore } from "../../stores/keybindingStore";

interface KeybindingsModalProps {
  onClose: () => void;
}

function buildConflicts(entries: [KeybindingActionId, string][]) {
  const byShortcut = new Map<string, KeybindingActionId[]>();
  for (const [action, shortcut] of entries) {
    if (!shortcut) continue;
    const list = byShortcut.get(shortcut) ?? [];
    list.push(action);
    byShortcut.set(shortcut, list);
  }
  const conflicts = new Set<KeybindingActionId>();
  for (const actions of byShortcut.values()) {
    if (actions.length > 1) {
      for (const action of actions) conflicts.add(action);
    }
  }
  return conflicts;
}

export default function KeybindingsModal({ onClose }: KeybindingsModalProps) {
  const keybindings = useKeybindingStore((s) => s.keybindings);
  const overrides = useKeybindingStore((s) => s.overrides);
  const setOverride = useKeybindingStore((s) => s.setOverride);
  const clearOverride = useKeybindingStore((s) => s.clearOverride);
  const resetAll = useKeybindingStore((s) => s.resetAll);

  const [capturing, setCapturing] = useState<KeybindingActionId | null>(null);

  const entries = useMemo(
    () => KEYBINDING_DEFINITIONS.map((def) => [def.action, keybindings[def.action]] as [KeybindingActionId, string]),
    [keybindings],
  );
  const conflicts = useMemo(() => buildConflicts(entries), [entries]);

  useEffect(() => {
    if (!capturing) return;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setCapturing(null);
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        clearOverride(capturing);
        setCapturing(null);
        return;
      }

      const shortcut = shortcutFromKeyboardEvent(e);
      if (!shortcut) return;
      setOverride(capturing, shortcut);
      setCapturing(null);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [capturing, clearOverride, setOverride]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(920px, 94vw)",
          maxHeight: "88vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: "var(--cmux-surface, #141414)",
          border: "1px solid var(--cmux-border, #2a2a2a)",
          borderRadius: 8,
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--cmux-border, #2a2a2a)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "var(--cmux-text, #ededed)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>
            Keyboard Shortcuts
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={resetAll}
              style={{
                background: "transparent",
                border: "1px solid var(--cmux-border, #2a2a2a)",
                color: "var(--cmux-text-secondary, #b0b0b0)",
                borderRadius: 4,
                padding: "6px 10px",
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: "pointer",
              }}
            >
              Restore defaults
            </button>
            <button
              onClick={onClose}
              style={{
                background: "var(--cmux-accent, #4b8bff)",
                border: "1px solid var(--cmux-accent, #4b8bff)",
                color: "#fff",
                borderRadius: 4,
                padding: "6px 10px",
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        </div>

        <div style={{ padding: "10px 16px", color: "var(--cmux-text-tertiary, #888)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", borderBottom: "1px solid var(--cmux-border, #2a2a2a)" }}>
          Click Rebind, then press a shortcut. Press Backspace/Delete to clear.
        </div>

        <div style={{ overflow: "auto", padding: "4px 0" }}>
          {KEYBINDING_DEFINITIONS.map((def) => {
            const current = keybindings[def.action];
            const overridden = overrides[def.action] !== undefined;
            const hasConflict = conflicts.has(def.action);
            const isCapturing = capturing === def.action;

            return (
              <div
                key={def.action}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr 190px 170px",
                  gap: 10,
                  alignItems: "center",
                  padding: "8px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--cmux-text-tertiary, #888)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {def.category}
                </div>
                <div style={{ fontSize: 12, color: "var(--cmux-text, #ededed)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {def.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: hasConflict ? "#ff6b6b" : "var(--cmux-text-secondary, #b0b0b0)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {isCapturing ? "Press keys..." : formatShortcutLabel(current)}
                  {overridden ? " *" : ""}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                  <button
                    onClick={() => setCapturing(def.action)}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--cmux-border, #2a2a2a)",
                      color: "var(--cmux-text-secondary, #b0b0b0)",
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono', monospace",
                      cursor: "pointer",
                    }}
                  >
                    Rebind
                  </button>
                  <button
                    onClick={() => clearOverride(def.action)}
                    disabled={!overridden}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--cmux-border, #2a2a2a)",
                      color: overridden ? "var(--cmux-text-secondary, #b0b0b0)" : "#666",
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 11,
                      fontFamily: "'JetBrains Mono', monospace",
                      cursor: overridden ? "pointer" : "not-allowed",
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
