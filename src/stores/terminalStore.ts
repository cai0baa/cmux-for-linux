import { create } from "zustand";
import type { TerminalSession, TerminalStatus } from "../types";

interface TerminalState {
  sessions: Record<string, TerminalSession>;

  // Actions
  registerSession: (session: TerminalSession) => void;
  updateStatus: (sessionId: string, status: TerminalStatus) => void;
  removeSession: (sessionId: string) => void;
  removeSessionsByWorkspace: (workspaceId: string) => void;
  getSession: (sessionId: string) => TerminalSession | undefined;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  sessions: {},

  registerSession: (session) => {
    set((state) => ({
      sessions: { ...state.sessions, [session.sessionId]: session },
    }));
  },

  updateStatus: (sessionId, status) => {
    set((state) => {
      const existing = state.sessions[sessionId];
      if (!existing) return state;
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: { ...existing, status },
        },
      };
    });
  },

  removeSession: (sessionId) => {
    set((state) => {
      const { [sessionId]: _, ...rest } = state.sessions;
      return { sessions: rest };
    });
  },

  removeSessionsByWorkspace: (workspaceId) => {
    set((state) => {
      const filtered: Record<string, TerminalSession> = {};
      for (const [key, session] of Object.entries(state.sessions)) {
        if (session.workspaceId !== workspaceId) {
          filtered[key] = session;
        }
      }
      return { sessions: filtered };
    });
  },

  getSession: (sessionId) => get().sessions[sessionId],
}));
