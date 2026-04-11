'use client';

import { AlertTriangle, Power, Puzzle } from 'lucide-react';
import type { ElizaOSAgentData } from './useElizaOSAgent';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';

/**
 * ElizaOS enabled-plugins card. Reads the live character's
 * `plugins` array (server filters out the redacted core plugins)
 * and renders them as chips. Clicking "Manage" jumps to the Skills
 * tab where ElizaOS plugins actually live in the Hatcher UI.
 *
 * Data comes from ElizaOSDashboard's single `useElizaOSAgent`
 * fetch rather than an independent call — see the hook in
 * `./useElizaOSAgent.ts` for the rationale.
 */
export function ElizaOSPluginsCard({
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
  const { setTab } = useAgentContext();

  if (!isActive) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Puzzle size={14} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Plugins</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Power size={12} />
          Start the agent to see enabled plugins.
        </div>
      </GlassCard>
    );
  }

  if (loading && !data) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      </GlassCard>
    );
  }

  if (error || !data) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-amber-400" />
          Plugins unavailable{error ? `: ${error}` : ''}
        </div>
      </GlassCard>
    );
  }

  const plugins = data.plugins ?? [];

  // Shorten the `@elizaos/plugin-xyz` namespace for display.
  const displayName = (pkg: string) =>
    pkg.replace(/^@elizaos\/plugin-/, '').replace(/^@/, '');

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Puzzle size={14} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Plugins</h3>
          <span className="text-[10px] text-[var(--text-muted)]">({plugins.length})</span>
        </div>
        <button
          onClick={() => setTab('skills')}
          className="text-[11px] px-3 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
        >
          Manage
        </button>
      </div>

      {plugins.length === 0 ? (
        <p className="text-[11px] text-[var(--text-muted)] italic">
          No optional plugins enabled. Visit the Plugins tab to turn some on.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {plugins.map((pkg) => (
            <span
              key={pkg}
              title={pkg}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium"
            >
              {displayName(pkg)}
            </span>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
