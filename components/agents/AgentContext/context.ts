'use client';

import { createContext, useContext } from 'react';
import type { AgentContextValue } from './types';

// ─── Context ─────────────────────────────────────────────────

export const AgentContext = createContext<AgentContextValue | null>(null);

export function useAgentContext(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgentContext must be used within AgentContext.Provider');
  return ctx;
}
