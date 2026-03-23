import { memo, useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";
import { open } from "@tauri-apps/plugin-shell";
import {
  createSession,
  writeToSession,
  resizeSession,
  onPtyExit,
  getTerminalConfig,
} from "../../lib/ipc";
import { usePaneMetadataStore, useUiStore } from "../../stores/workspaceStore";
import type { AgentStatus } from "../../stores/paneMetadataStoreCompat";
import { useKeybindingStore } from "../../stores/keybindingStore";
import { useThemeStore } from "../../stores/themeStore";
import type { ITheme } from "@xterm/xterm";

interface XTermWrapperProps {
  sessionId: string;
  command: string;
  args?: string[];
  onExit?: () => void;
  theme?: ITheme;
  fontSize?: number;
  fontFamily?: string;
  suppressNotifications?: boolean;
  onZoomToggle?: () => void;
  onUrlClick?: (url: string) => void;
  cwd?: string;
}

const ANSI_KEYS: (keyof ITheme)[] = [
  "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
  "brightBlack", "brightRed", "brightGreen", "brightYellow",
  "brightBlue", "brightMagenta", "brightCyan", "brightWhite",
];

function buildThemeFromConfig(cfg: { background: string; foreground: string; ansi: string[] }): ITheme {
  const theme: ITheme = {
    background: cfg.background,
    foreground: cfg.foreground,
    cursor: cfg.foreground,
    selectionBackground: "#404040",
  };
  for (let i = 0; i < ANSI_KEYS.length && i < cfg.ansi.length; i++) {
    (theme as Record<string, string>)[ANSI_KEYS[i] as string] = cfg.ansi[i];
  }
  return theme;
}

const DEFAULT_THEME: ITheme = {
  background: "#0a0a0a",
  foreground: "#ededed",
  cursor: "#f5e0dc",
  selectionBackground: "#404040",
  black: "#171717",
  red: "#f38ba8",
  green: "#a6e3a1",
  yellow: "#f9e2af",
  blue: "#89b4fa",
  magenta: "#f5c2e7",
  cyan: "#94e2d5",
  white: "#bac2de",
  brightBlack: "#585b70",
  brightRed: "#f38ba8",
  brightGreen: "#a6e3a1",
  brightYellow: "#f9e2af",
  brightBlue: "#89b4fa",
  brightMagenta: "#f5c2e7",
  brightCyan: "#94e2d5",
  brightWhite: "#ededed",
};

// Cache terminal config globally — fetched once, reused across all panes
let cachedConfig: { theme: ITheme; fontSize: number; fontFamily: string } | null = null;
let configPromise: Promise<void> | null = null;

function ensureConfigLoaded(): Promise<void> {
  if (cachedConfig) return Promise.resolve();
  if (configPromise) return configPromise;
  configPromise = getTerminalConfig()
    .then((cfg) => {
      // Ghostty/native terminals use physical pixels; xterm.js in a webview uses CSS pixels.
      // Scale up: values below 12 are physical-pixel sizes (e.g. Ghostty font-size = 9)
      // and need to be multiplied to look correct in the webview.
      const rawSize = cfg.font_size;
      const scaled = rawSize < 12 ? Math.round(rawSize * 1.6) : rawSize;
      const fontSize = Math.max(14, scaled);
      cachedConfig = {
        theme: buildThemeFromConfig(cfg),
        fontSize,
        fontFamily: `'${cfg.font_family}', monospace`,
      };
    })
    .catch(() => {
      cachedConfig = null;
      configPromise = null;
    });
  return configPromise;
}

export default memo(function XTermWrapper({
  sessionId,
  command,
  args = [],
  onExit,
  theme,
  fontSize,
  fontFamily,
  suppressNotifications = false,
  onZoomToggle,
  onUrlClick,
  cwd,
}: XTermWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const storeTheme = useThemeStore((s) => s.theme);
  const storeFontSize = useThemeStore((s) => s.fontSize);

  // Dynamically update terminal theme and font size
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = storeTheme.terminal;
      termRef.current.options.fontSize = storeFontSize;
      setTimeout(() => fitAddonRef.current?.fit(), 10);
    }
  }, [storeTheme, storeFontSize]);

  useEffect(() => {
    const mountStart = performance.now();
    console.log(`[PERF] XTermWrapper mounting for session ${sessionId}`);
    
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let unlistenExit: (() => void) | null = null;
    let term: Terminal | null = null;
    let fitAddon: FitAddon | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimeout: ReturnType<typeof setTimeout>;
    let logThrottle: ReturnType<typeof setTimeout> | null = null;

    async function init() {
      if (disposed) return;
      const initStart = performance.now();

      // Use cached config if available (instant), otherwise use defaults
      const cfg = cachedConfig;
      const initTheme = theme ?? cfg?.theme ?? DEFAULT_THEME;
      const initFontSize = fontSize ?? cfg?.fontSize ?? 14;
      const initFontFamily = fontFamily ?? cfg?.fontFamily ?? "'JetBrainsMono Nerd Font Mono', 'JetBrains Mono', 'Geist Mono', 'SF Mono', monospace";

      term = new Terminal({
        cursorBlink: true,
        cursorStyle: "block",
        fontSize: initFontSize,
        fontFamily: initFontFamily,
        fontWeight: 400,
        fontWeightBold: 600,
        letterSpacing: -1,
        lineHeight: 1.0,
        rescaleOverlappingGlyphs: true,
        customGlyphs: true,
        theme: initTheme,
        allowTransparency: false,
        scrollback: 5000,
        smoothScrollDuration: 0,
      });
      termRef.current = term;

      fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;
      const searchAddon = new SearchAddon();
      searchAddonRef.current = searchAddon;
      
      term.loadAddon(fitAddon);
      term.loadAddon(searchAddon);
      term.loadAddon(new WebLinksAddon((_e, uri) => {
        if (onUrlClick) {
          onUrlClick(uri);
        } else {
          open(uri).catch(err => console.error("Failed to open URL:", err));
        }
      }));

      term.open(container!);

      // Forward modifier+key combos that xterm intercepts before the PTY sees them
      term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
        if (e.type !== "keydown") return true;

        const keybindingStore = useKeybindingStore.getState();
        
        // Check if this event matches ANY app shortcut
        const actions = keybindingStore.getActionsForEvent(e);
        
        // If it matches an app shortcut, let it bubble to AppShell's window listener
        // by returning false (tells xterm to NOT handle it)
        if (actions.length > 0) {
          // Handle terminal-specific shortcuts here before bubbling
          if (actions.includes("terminal.search")) {
            setIsSearchOpen(true);
            setTimeout(() => searchInputRef.current?.focus(), 50);
            return false;
          }
          
          if (actions.includes("pane.zoom.toggle")) {
            onZoomToggle?.();
            return false;
          }
          
          // For all other shortcuts (pane split, workspace nav, etc.),
          // return false to let the event bubble to AppShell
          return false;
        }
        
        // Shift+Enter → send as \x1b[13;2u (kitty protocol) which most apps understand,
        // but many shells/apps just want \r — send the CSI form so it round-trips correctly.
        if (e.key === "Enter" && e.shiftKey && !e.ctrlKey && !e.altKey) {
          writeToSession(sessionId, "\x1b[13;2u").catch(console.error);
          return false; // prevent xterm's default handling
        }
        
        // No app shortcut match → let xterm handle it normally (typing, Ctrl+C, etc.)
        return true;
      });

      // Send user keystrokes to PTY — plain text, no encoding
      term.onData((data) => {
        writeToSession(sessionId, data).catch(console.error);
      });

      term.onBinary((data) => {
        writeToSession(sessionId, data).catch(console.error);
      });

      // Track terminal title changes (set via escape sequences by shells/apps)
      term.onTitleChange((title) => {
        if (disposed || !title) return;
        usePaneMetadataStore.getState().setMetadata(sessionId, { processTitle: title });
      });

      let _lastParsedOut = "";
      term.onWriteParsed(() => {
        if (!term) return;
        // Throttle to 500ms — prevents hammering Zustand on every keystroke
        if (logThrottle) return;
        logThrottle = setTimeout(() => {
          logThrottle = null;
          if (!term || disposed) return;
          const buf = term.buffer.active;
          const y = buf.baseY + buf.cursorY;
          let lastLine = "";

          for (let i = y; i >= Math.max(0, y - 10); i--) {
            const lineObj = buf.getLine(i);
            if (lineObj) {
              const text = lineObj.translateToString(true).trim();
              if (text.length > 0) {
                lastLine = text;
                break;
              }
            }
          }

          if (lastLine.length > 0 && lastLine !== _lastParsedOut) {
            _lastParsedOut = lastLine;

            // Detect Claude Code agent status from output patterns
            let agentStatus: AgentStatus | undefined;
            const stripped = lastLine.replace(/\x1b\[[0-9;]*m/g, "").trim();
            if (/(\u2737|\u2731|esc to interrupt)/i.test(stripped) || /working\.\.\./i.test(stripped)) {
              agentStatus = "working";
            } else if (/\?\s*(Yes|No|\[y\/n\])/i.test(stripped) || /do you want to/i.test(stripped) || /press enter/i.test(stripped)) {
              agentStatus = "waiting";
            } else if (/\u2713\s*(done|complete|finished)/i.test(stripped) || /^>\s*$/.test(stripped) || /\$\s*$/.test(stripped)) {
              agentStatus = "done";
            }

            // Filter out terminal chrome / status bar noise before storing as log line.
            // These patterns match Claude Code's bottom status bar (token cost, session info)
            // and other terminal UI lines that aren't meaningful agent output.
            const isNoiseLine =
              /\d+k?\s+tokens/i.test(stripped) ||
              /access \d+/i.test(stripped) ||
              /past research/i.test(stripped) ||
              /http:\/\/localhost/i.test(stripped) ||
              /^\s*[\u2500-\u257F]+\s*$/.test(stripped) || // box-drawing chars only
              stripped.length < 3;

            // When agent returns to shell prompt (done/idle), clear the log line.
            // For noise lines, omit the key entirely so the previous meaningful value is preserved.
            const isShellPrompt = /^>\s*$/.test(stripped) || /\$\s*$/.test(stripped);
            const logLineUpdate = isShellPrompt
              ? { lastLogLine: undefined }          // clear on shell prompt
              : isNoiseLine
                ? {}                               // preserve previous value for noise
                : { lastLogLine: lastLine };       // update with meaningful line

            usePaneMetadataStore.getState().setMetadata(sessionId, {
              ...logLineUpdate,
              ...(agentStatus ? { agentStatus } : {}),
            });
            // Trigger notification only when pane is not active and not suppressed
            if (!suppressNotifications) {
              const activePaneId = useUiStore.getState().activePaneId;
              if (activePaneId !== sessionId) {
                usePaneMetadataStore.getState().incrementNotification(sessionId);
              }
            }
          }
        }, 500);
      });

      // Register exit listener before spawning PTY to avoid race
      let sessionStarted = false;
      unlistenExit = await onPtyExit(sessionId, () => {
        if (disposed || !sessionStarted) return;
        onExit?.();
      });

      if (disposed) {
        unlistenExit?.();
        return;
      }

      fitAddon.fit();
      const cols = term.cols;
      const rows = term.rows;

      try {
        await createSession(sessionId, command, args, cols, rows, (rawData: ArrayBuffer) => {
          if (disposed || !term) return;
          term.write(new Uint8Array(rawData));
        }, cwd);
        sessionStarted = true;
        console.log(`[PERF] Terminal session created - ${(performance.now() - initStart).toFixed(2)}ms`);
      } catch (err) {
        console.error("[XTermWrapper] Failed to create session:", err);
        term.writeln(`\r\n\x1b[31mFailed to start: ${err}\x1b[0m`);
      }

      // Resize observer — 50ms debounce (was 100ms)
      resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          if (disposed || !fitAddon || !term) return;
          fitAddon.fit();
          resizeSession(sessionId, term.cols, term.rows).catch(console.error);
        }, 50);
      });
      resizeObserver.observe(container!);

      // If config wasn't cached yet, apply it once loaded (only for first terminal)
      if (!cfg && !theme && !fontSize && !fontFamily) {
        ensureConfigLoaded().then(() => {
          if (disposed || !term || !cachedConfig) return;
          term.options.theme = cachedConfig.theme;
          term.options.fontSize = cachedConfig.fontSize;
          term.options.fontFamily = cachedConfig.fontFamily;
          fitAddon?.fit();
        });
      }
    }

    init();

    return () => {
      disposed = true;
      const cleanupStart = performance.now();
      clearTimeout(resizeTimeout);
      if (logThrottle) { clearTimeout(logThrottle); logThrottle = null; }
      resizeObserver?.disconnect();
      unlistenExit?.();
      term?.dispose();
      searchAddonRef.current = null;
      console.log(`[PERF] XTermWrapper unmounted for session ${sessionId} - mount duration: ${(cleanupStart - mountStart).toFixed(2)}ms, cleanup: ${(performance.now() - cleanupStart).toFixed(2)}ms`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val && searchAddonRef.current) {
      searchAddonRef.current.findNext(val, { decorations: { matchBackground: '#404040', matchBorder: '#89b4fa', matchOverviewRuler: '#89b4fa', activeMatchBackground: '#89b4fa', activeMatchBorder: '#89b4fa', activeMatchColorOverviewRuler: '#89b4fa' } });
    } else if (searchAddonRef.current) {
      searchAddonRef.current.clearDecorations();
    }
  }, []);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        searchAddonRef.current?.findPrevious(searchQuery);
      } else {
        searchAddonRef.current?.findNext(searchQuery);
      }
    } else if (e.key === "Escape") {
      setIsSearchOpen(false);
      setSearchQuery("");
      searchAddonRef.current?.clearDecorations();
      containerRef.current?.querySelector("textarea")?.focus();
    }
  }, [searchQuery]);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
    searchAddonRef.current?.clearDecorations();
    containerRef.current?.querySelector("textarea")?.focus();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const paths = Array.from(e.dataTransfer.files).map((f) => {
        const path = (f as any).path || f.name;
        // Escape spaces
        return `"${path}"`;
      });
      writeToSession(sessionId, paths.join(" ") + " ").catch(console.error);
    }
  }, [sessionId]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }} onDrop={handleDrop} onDragOver={handleDragOver}>
      {isSearchOpen && (
        <div style={{
          position: "absolute",
          top: 8,
          right: 16,
          zIndex: 50,
          background: "var(--cmux-bg, #1a1a1a)",
          border: "1px solid var(--cmux-border, #333)",
          borderRadius: 6,
          padding: "4px 8px",
          display: "flex",
          gap: 8,
          alignItems: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          color: "var(--cmux-text, #ededed)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12
        }}>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="Find..."
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              outline: "none",
              fontFamily: "inherit",
              fontSize: "inherit",
              width: 150
            }}
          />
          <button onClick={() => searchAddonRef.current?.findPrevious(searchQuery)} style={searchBtnStyle}>↑</button>
          <button onClick={() => searchAddonRef.current?.findNext(searchQuery)} style={searchBtnStyle}>↓</button>
          <button onClick={closeSearch} style={searchBtnStyle}>✕</button>
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          position: "relative",
          contain: "strict",
        }}
      />
    </div>
  );
});

const searchBtnStyle = {
  background: "transparent",
  border: "none",
  color: "inherit",
  cursor: "pointer",
  padding: "0 4px",
  opacity: 0.7,
  fontFamily: "inherit"
};
