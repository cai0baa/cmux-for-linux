import { useThemeStore } from "../../stores/themeStore";
import { THEMES } from "./themeDefinitions";

interface ThemeSwitcherProps {
  onClose: () => void;
  onOpenKeybindings?: () => void;
}

export default function ThemeSwitcher({ onClose, onOpenKeybindings }: ThemeSwitcherProps) {
  const currentId = useThemeStore((s) => s.themeId);
  const setTheme = useThemeStore((s) => s.setTheme);
  const fontSize = useThemeStore((s) => s.fontSize);
  const setFontSize = useThemeStore((s) => s.setFontSize);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 360,
          background: "#141414",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
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
          Settings
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              color: "#a3a3a3",
              marginBottom: 8,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Theme
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
            }}
          >
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  background:
                    currentId === theme.id
                      ? theme.chrome.surface
                      : "#1a1a1a",
                  border:
                    currentId === theme.id
                      ? `1px solid ${theme.chrome.accent}`
                      : "1px solid #2a2a2a",
                  borderRadius: 4,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    background: theme.terminal.background,
                    border: `1px solid ${theme.chrome.border}`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color:
                      currentId === theme.id
                        ? theme.chrome.accent
                        : "#a3a3a3",
                    fontFamily: "'JetBrains Mono', monospace",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {theme.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              color: "#a3a3a3",
              marginBottom: 8,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Font Size: {fontSize}px
          </div>
          <input
            type="range"
            min={10}
            max={24}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onOpenKeybindings}
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: 4,
              color: "#a3a3a3",
              padding: "6px 16px",
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: "pointer",
              marginRight: 8,
            }}
          >
            Keyboard Shortcuts
          </button>
          <button
            onClick={onClose}
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
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
