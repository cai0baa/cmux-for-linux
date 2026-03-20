import { memo } from "react";
import type { Pane, PaneTab } from "../../types";
import { getAgent, getDefaultAgent } from "../../lib/agents";
import { usePaneMetadataStore } from "../../stores/workspaceStore";

interface PaneTabBarProps {
  pane: Pane;
  workspaceId: string;
  hasNotification?: boolean;
  onClose?: () => void;
  onSplitRight?: () => void;
  onSplitDown?: () => void;
  onAddTab?: (agentId?: string, type?: PaneTab["type"]) => void;
  onRemoveTab?: (tabId: string) => void;
  onSelectTab?: (tabId: string) => void;
}

const FolderIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const SplitRightIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="12" y1="3" x2="12" y2="21"></line>
    <line x1="12" y1="12" x2="21" y2="12"></line>
  </svg>
);

const SplitDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="12" y1="12" x2="12" y2="21"></line>
  </svg>
);

const CloseIcon = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const GlobeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);

export default memo(function PaneTabBar({
  pane,
  hasNotification,
  onClose,
  onSplitRight,
  onSplitDown,
  onAddTab,
  onRemoveTab,
  onSelectTab,
}: PaneTabBarProps) {
  const paneMeta = usePaneMetadataStore((s) => s.metadata[pane.sessionId]);
  const paneCwd = paneMeta?.cwd;
  const processTitle = paneMeta?.processTitle;

  return (
    <div
      className="pane-tabbar"
      style={{
        height: 36,
        display: "flex",
        alignItems: "center",
        background: "#1a1a1a",
        borderBottom: hasNotification
          ? "1px solid rgba(255, 59, 48, 0.5)"
          : "1px solid var(--cmux-border)",
        flexShrink: 0,
        userSelect: "none",
        position: "relative",
        overflow: "visible",
        zIndex: 10,
      }}
    >
      {/* Tab pills — overflow:hidden here to clip tab text, not the dropdown */}
      <div style={{ display: "flex", alignItems: "center", flex: 1, overflow: "hidden", minWidth: 0 }}>
        {pane.tabs.map((tab) => {
          const agent = getAgent(tab.agentId) ?? getDefaultAgent();
          const isActive = tab.id === pane.activeTabId;
          const label = tab.label
            ?? (tab.type === "browser"
              ? "Browser"
              : processTitle
                ? processTitle
                : (isActive && paneCwd ? paneCwd.split("/").pop() || agent.name : agent.name));

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab?.(tab.id)}
              title={label}
              className={`pane-tab-pill ${isActive ? "is-active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "0 8px 0 7px",
                height: 36,
                maxWidth: 160,
                cursor: "pointer",
                background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                borderRight: "1px solid var(--cmux-border)",
                borderBottom: isActive ? `2px solid var(--cmux-accent)` : "2px solid transparent",
                flexShrink: 0,
                transition: "background 0.1s",
              }}
            >
              {/* notification dot */}
              {hasNotification && isActive && (
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff3b30", flexShrink: 0 }} />
              )}
              {/* folder icon */}
              <span style={{ color: isActive ? "var(--cmux-accent)" : "var(--cmux-text-tertiary)", flexShrink: 0 }}>
                <FolderIcon />
              </span>
              {/* label */}
              <span
                className="pane-tab-label"
                style={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Geist Mono', monospace",
                  color: isActive ? "var(--cmux-text)" : "var(--cmux-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {label}
              </span>
              {/* close tab button */}
              {pane.tabs.length > 1 && (
                <button
                  className="pane-action-btn"
                  onClick={(e) => { e.stopPropagation(); onRemoveTab?.(tab.id); }}
                  title="Close tab"
                  style={{ padding: 2, flexShrink: 0 }}
                >
                  <CloseIcon size={9} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add terminal tab — direct, no dropdown */}
      <button
        className="pane-action-btn"
        onClick={() => onAddTab?.(getDefaultAgent().id, "terminal")}
        title="New terminal tab"
        style={{ margin: "0 1px", padding: "3px 5px", flexShrink: 0 }}
      >
        <PlusIcon />
      </button>
      {/* Add browser tab */}
      <button
        className="pane-action-btn"
        onClick={() => onAddTab?.(undefined, "browser")}
        title="New browser tab"
        style={{ margin: "0 2px", padding: "3px 5px", flexShrink: 0 }}
      >
        <GlobeIcon />
      </button>

      {/* Right: split + close pane buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, paddingRight: 6, flexShrink: 0 }}>
        {onSplitRight && (
          <button className="pane-action-btn" onClick={onSplitRight} title="Split right">
            <SplitRightIcon />
          </button>
        )}
        {onSplitDown && (
          <button className="pane-action-btn" onClick={onSplitDown} title="Split down">
            <SplitDownIcon />
          </button>
        )}
        {onClose && (
          <button className="pane-action-btn" onClick={onClose} title="Close pane">
            <CloseIcon size={11} />
          </button>
        )}
      </div>
    </div>
  );
});
