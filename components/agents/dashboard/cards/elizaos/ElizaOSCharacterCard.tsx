'use client';

import { AlertTriangle, Power, User } from 'lucide-react';
import type { ElizaOSAgentData } from './useElizaOSAgent';
import { GlassCard, Skeleton } from '../../../AgentContext';

/**
 * ElizaOS character / persona card. Renders the bio, topics,
 * adjectives, and a truncated system prompt preview from the
 * shared ElizaOS agent data passed down by ElizaOSDashboard.
 *
 * Data comes from ElizaOSDashboard's single fetch of
 * `getElizaosAgent` instead of each card fetching independently —
 * halves the API calls and keeps the two cards (Character and
 * Plugins) in sync with each other.
 */
export function ElizaOSCharacterCard({
  data,
  error,
  loading,
  isActive,
}: {
  data: ElizaOSAgentData | null;
  error: string | null;
  loading: boolean;
  isActive: boolean;
}) {
  if (!isActive) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <User size={14} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Character</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Power size={12} />
          Start the agent to view its character.
        </div>
      </GlassCard>
    );
  }

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

  const bio = data.bio ?? [];
  const topics = data.topics ?? [];
  const adjectives = data.adjectives ?? [];
  const system = data.system ?? '';
  const systemPreview =
    system.length > 240 ? system.slice(0, 240).trim() + '…' : system;

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

      {bio.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Bio
          </div>
          <ul className="space-y-1">
            {bio.slice(0, 4).map((line, i) => (
              <li key={i} className="text-xs text-[var(--text-secondary)] leading-relaxed">
                • {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {topics.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Topics
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topics.slice(0, 10).map((topic) => (
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

      {adjectives.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Adjectives
          </div>
          <div className="flex flex-wrap gap-1.5">
            {adjectives.slice(0, 10).map((adj) => (
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
