export type KeybindingActionId =
  | "sidebar.toggle"
  | "workspace.new"
  | "workspace.next"
  | "workspace.prev"
  | "workspace.close"
  | "workspace.jump.1"
  | "workspace.jump.2"
  | "workspace.jump.3"
  | "workspace.jump.4"
  | "workspace.jump.5"
  | "workspace.jump.6"
  | "workspace.jump.7"
  | "workspace.jump.8"
  | "workspace.jump.9"
  | "pane.flash"
  | "pane.focus.left"
  | "pane.focus.right"
  | "pane.focus.up"
  | "pane.focus.down"
  | "pane.split.right"
  | "pane.split.down"
  | "pane.close"
  | "pane.newBrowserTab"
  | "palette.open"
  | "settings.keybindings"
  | "pane.zoom.toggle"
  | "terminal.search";

export interface KeybindingDefinition {
  action: KeybindingActionId;
  title: string;
  category: "Global" | "Workspace" | "Pane" | "Terminal";
  defaultShortcut: string;
}

export const KEYBINDING_DEFINITIONS: KeybindingDefinition[] = [
  { action: "sidebar.toggle", title: "Toggle sidebar", category: "Global", defaultShortcut: "ctrl+b" },
  { action: "palette.open", title: "Open command palette", category: "Global", defaultShortcut: "ctrl+shift+p" },
  { action: "settings.keybindings", title: "Open keyboard shortcuts", category: "Global", defaultShortcut: "ctrl+," },

  { action: "workspace.new", title: "New workspace", category: "Workspace", defaultShortcut: "ctrl+shift+n" },
  { action: "workspace.next", title: "Next workspace", category: "Workspace", defaultShortcut: "ctrl+tab" },
  { action: "workspace.prev", title: "Previous workspace", category: "Workspace", defaultShortcut: "ctrl+shift+tab" },
  { action: "workspace.close", title: "Close workspace", category: "Workspace", defaultShortcut: "ctrl+shift+w" },
  { action: "workspace.jump.1", title: "Jump to workspace 1", category: "Workspace", defaultShortcut: "ctrl+1" },
  { action: "workspace.jump.2", title: "Jump to workspace 2", category: "Workspace", defaultShortcut: "ctrl+2" },
  { action: "workspace.jump.3", title: "Jump to workspace 3", category: "Workspace", defaultShortcut: "ctrl+3" },
  { action: "workspace.jump.4", title: "Jump to workspace 4", category: "Workspace", defaultShortcut: "ctrl+4" },
  { action: "workspace.jump.5", title: "Jump to workspace 5", category: "Workspace", defaultShortcut: "ctrl+5" },
  { action: "workspace.jump.6", title: "Jump to workspace 6", category: "Workspace", defaultShortcut: "ctrl+6" },
  { action: "workspace.jump.7", title: "Jump to workspace 7", category: "Workspace", defaultShortcut: "ctrl+7" },
  { action: "workspace.jump.8", title: "Jump to workspace 8", category: "Workspace", defaultShortcut: "ctrl+8" },
  { action: "workspace.jump.9", title: "Jump to last workspace", category: "Workspace", defaultShortcut: "ctrl+9" },

  { action: "pane.flash", title: "Flash focused pane", category: "Pane", defaultShortcut: "ctrl+shift+h" },
  { action: "pane.focus.left", title: "Focus pane left", category: "Pane", defaultShortcut: "ctrl+alt+arrowleft" },
  { action: "pane.focus.right", title: "Focus pane right", category: "Pane", defaultShortcut: "ctrl+alt+arrowright" },
  { action: "pane.focus.up", title: "Focus pane up", category: "Pane", defaultShortcut: "ctrl+alt+arrowup" },
  { action: "pane.focus.down", title: "Focus pane down", category: "Pane", defaultShortcut: "ctrl+alt+arrowdown" },
  { action: "pane.split.right", title: "Split pane right", category: "Pane", defaultShortcut: "ctrl+alt+d" },
  { action: "pane.split.down", title: "Split pane down", category: "Pane", defaultShortcut: "ctrl+alt+shift+d" },
  { action: "pane.close", title: "Close active pane", category: "Pane", defaultShortcut: "ctrl+alt+w" },
  // Browser pane disabled for now (too laggy)
  // { action: "pane.newBrowserTab", title: "Open browser tab in pane", category: "Pane", defaultShortcut: "ctrl+shift+l" },
  { action: "pane.zoom.toggle", title: "Toggle pane zoom", category: "Pane", defaultShortcut: "ctrl+shift+enter" },

  { action: "terminal.search", title: "Find in terminal", category: "Terminal", defaultShortcut: "ctrl+shift+f" },
];

const MOD_ORDER = ["ctrl", "alt", "shift", "meta"];

export const DEFAULT_KEYBINDINGS: Record<KeybindingActionId, string> = {
  ...KEYBINDING_DEFINITIONS.reduce(
    (acc, def) => {
      acc[def.action] = normalizeShortcut(def.defaultShortcut);
      return acc;
    },
    {} as Record<KeybindingActionId, string>,
  ),
  // Disabled features still need a default to satisfy the type
  "pane.newBrowserTab": "",
};

function normalizeKey(key: string): string {
  const k = key.toLowerCase();
  if (k === " ") return "space";
  if (k === "esc") return "escape";
  return k;
}

export function normalizeShortcut(shortcut: string): string {
  const rawParts = shortcut
    .split("+")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  const mods = new Set<string>();
  let key = "";

  for (const part of rawParts) {
    if (part === "cmd") {
      mods.add("meta");
      continue;
    }
    if (MOD_ORDER.includes(part)) {
      mods.add(part);
      continue;
    }
    key = normalizeKey(part);
  }

  const orderedMods = MOD_ORDER.filter((m) => mods.has(m));
  return key ? [...orderedMods, key].join("+") : orderedMods.join("+");
}

export function shortcutFromKeyboardEvent(e: KeyboardEvent): string {
  const mods: string[] = [];
  if (e.ctrlKey) mods.push("ctrl");
  if (e.altKey) mods.push("alt");
  if (e.shiftKey) mods.push("shift");
  if (e.metaKey) mods.push("meta");
  const key = normalizeKey(e.key);
  const isModifierOnly = ["control", "alt", "shift", "meta"].includes(key);
  if (!isModifierOnly) {
    mods.push(key);
  }
  return normalizeShortcut(mods.join("+"));
}

export function eventMatchesShortcut(e: KeyboardEvent, shortcut?: string): boolean {
  if (!shortcut) return false;
  const normalized = normalizeShortcut(shortcut);
  if (!normalized) return false;
  return shortcutFromKeyboardEvent(e) === normalized;
}

export function getActionDefinition(action: KeybindingActionId): KeybindingDefinition {
  return KEYBINDING_DEFINITIONS.find((d) => d.action === action)!;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

export function formatShortcutLabel(shortcut: string): string {
  const parts = normalizeShortcut(shortcut).split("+");
  return parts
    .map((p) => {
      if (p === "ctrl") return "Ctrl";
      if (p === "alt") return "Alt";
      if (p === "shift") return "Shift";
      if (p === "meta") return "Meta";
      if (p.startsWith("arrow")) return `Arrow${p.slice(5)}`;
      if (p === " ") return "Space";
      return p.length === 1 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join("+");
}
