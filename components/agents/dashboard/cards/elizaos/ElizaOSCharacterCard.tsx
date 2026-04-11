'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, User } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';

interface CharacterData {
  id: string;
  name: string;
  system: string;
  bio: string[];
  topics: string[];
  adjectives: string[];
  plugins: string[];
  enabled: boolean;
  status: string;
}

/**
 * ElizaOS character / persona card. Pulls the live character from
 * the running container (secrets already redacted server-side) and
 * surfaces bio, topics, and adjectives — the three fields that
 * actually shape how the character talks. System prompt is exposed
 * as a truncated preview (first ~200 chars).
 */
export function ElizaOSCharacterCard() {
  const { agent } = useAgentContext();
  const [data, setData] = useState<CharacterData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCharacter = useCallback(async () => {
    try {
      const res = await api.getElizaosAgent(agent.id);
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
  }, [agent.id]);

  useEffect(() => {
    fetchCharacter();
  }, [fetchCharacter]);

  if (loading && !data) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-16 w-full" />
        </div>
      </GlassCard>
    );
  }

  if (error || !data) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-amber-400" />
          Character unavailable{error ? `: ${error}` : ''}
        </div>
      </GlassCard>
    );
  }

  const systemPreview =
    data.system.length > 240 ? data.system.slice(0, 240).trim() + '…' : data.system;

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <User size={14} className="text-cyan-400" />
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Character</h3>
        <span
          className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border ${
            data.enabled
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-default)]'
          }`}
        >
          {data.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {data.bio.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Bio
          </div>
          <ul className="space-y-1">
            {data.bio.slice(0, 4).map((line, i) => (
              <li key={i} className="text-xs text-[var(--text-secondary)] leading-relaxed">
                • {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.topics.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Topics
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.topics.slice(0, 10).map((topic) => (
              <span
                key={topic}
                className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.adjectives.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Adjectives
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.adjectives.slice(0, 10).map((adj) => (
              <span
                key={adj}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)]"
              >
                {adj}
              </span>
            ))}
          </div>
        </div>
      )}

      {systemPreview && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            System Prompt (preview)
          </div>
          <p className="text-[11px] text-[var(--text-muted)] italic leading-relaxed">
            {systemPreview}
          </p>
        </div>
      )}
    </GlassCard>
  );
}
