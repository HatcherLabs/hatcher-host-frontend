"use client";

import { createContext, useContext } from "react";
import type { Agent } from "@/lib/api";

export interface WorkspaceState {
  agents: Agent[];
  agentsLoading: boolean;
  agentsError: string | null;
  refreshAgents: () => Promise<void>;
  chatTarget: HTMLElement | null;
  headerTarget: HTMLElement | null;
  navigationTarget: HTMLElement | null;
  actionsTarget: HTMLElement | null;
  toolsTarget: HTMLElement | null;
  settingsTarget: HTMLElement | null;
  openSidebar: () => void;
  closeSidebar: () => void;
}
export const WorkspaceContext = createContext<WorkspaceState | null>(null);
export const useWorkspace = () => useContext(WorkspaceContext);
