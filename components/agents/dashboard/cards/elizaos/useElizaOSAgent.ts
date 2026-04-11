'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAgentContext } from '../../../AgentContext';

/**
 * Shared response shape from `api.getElizaosAgent`. Declared here so
 * the Character and Plugins cards (and any future consumer) can refer
 * to one type instead of re-declaring it.
 *
 * Note: `style` and `settings` are the raw objects returned by the
 * ElizaOS server (settings.secrets already redacted to "***"). The
 * cards only read a handful of fields, so we keep the permissive
 * `Record<string, unknown>` type here rather than tightening it.
 */
export interface ElizaOSAgentData {
  id: string;
  name: string;
  system: string;
  bio: string[];
  topics: string[];
  adjectives: string[];
  plugins: string[];
  style: Record<string, unknown>;
  settings: Record<string, unknown>;
  enabled: boolean;
  status: string;
}

/**
 * Single-fetch hook for the live ElizaOS character. Used once by
 * ElizaOSDashboard and the result is passed into both
 * ElizaOSCharacterCard and ElizaOSPluginsCard — instead of each
 * card fetching independently, which used to double the API call
 * rate on the dashboard (review finding from PR #5 final pass).
 *
 * Returns the same `{data, error, loading}` shape both cards
 * expect, so the parent component can render both on a single
 * fetch lifecycle and get unified loading / error handling.
 */
export function useElizaOSAgent(agentId: string): {
  data: ElizaOSAgentData | null;
  error: string | null;
  loading: boolean;
  isActive: boolean;
} {
  const { agent } = useAgentContext();
  const isActive = agent.status === 'active';
  const [data, setData] = useState<ElizaOSAgentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAgent = useCallback(async () => {
    if (!isActive) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.getElizaosAgent(agentId);
      if (res.success) {
        setData(res.data);
        setError(null);
      } else {
        setError('error' in res ? res.error : 'Failed to load character');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agentId, isActive]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  return { data, error, loading, isActive };
}
