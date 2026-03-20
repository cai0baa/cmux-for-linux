import { create } from "zustand";
import type { ThemeDefinition } from "../types";
import { getTheme } from "../components/theme/themeDefinitions";

interface ThemeState {
  themeId: string;
  theme: ThemeDefinition;
  fontSize: number;

  setTheme: (id: string) => void;
  setFontSize: (size: number) => void;
  hydrateSettings: (settings: { themeId?: string; fontSize?: number }) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeId: "midnight",
  theme: getTheme("midnight"),
  fontSize: 14,

  setTheme: (id) => {
    const theme = getTheme(id);
    set({ themeId: id, theme });
  },

  setFontSize: (fontSize) => {
    set({ fontSize: Math.max(10, Math.min(24, fontSize)) });
  },

  hydrateSettings: (settings) => {
    const nextThemeId = settings.themeId ?? "midnight";
    const nextTheme = getTheme(nextThemeId);
    const nextFont = typeof settings.fontSize === "number"
      ? Math.max(10, Math.min(24, settings.fontSize))
      : 14;
    set({
      themeId: nextThemeId,
      theme: nextTheme,
      fontSize: nextFont,
    });
  },
}));
