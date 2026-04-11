'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Power, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';

interface HermesSkillsData {
  totalSkills: number;
  totalCategories: number;
  topCategories: Array<{ id: string; skillCount: number }>;
}

/**
 * Hermes bundled-skills catalog card. Surfaces:
 *   - Total skills count (typically ~2k on a full managed volume)
 *   - Category count
 *   - Top 5 categories by skill count
 *
 * The real skills browser lives in the Skills tab — this card is
 * just a snapshot so the user sees "I have 2000 skills, what are
 * the big categories?" at a glance.
 */
export function HermesSkillsCard() {
  const { agent, setTab } = useAgentContext();
  const isActive = agent.status === 'active';
  const [data, setData] = useState<HermesSkillsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSkills = useCallback(async () => {
    if (!isActive) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.getHermesSkills(agent.id);
      if (res.success) {
        const topCategories = [...res.data.categories]
          .sort((a, b) => b.skillCount - a.skillCount)
          .slice(0, 5)
          .map((c) => ({ id: c.id, skillCount: c.skillCount }));
        setData({
          totalSkills: res.data.totalSkills,
          totalCategories: res.data.totalCategories,
          topCategories,
        });
        setError(null);
      } else {
        setError('error' in res ? res.error : 'Failed to load skills');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent.id, isActive]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  if (!isActive) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Bundled Skills</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Power size={12} />
          Start the agent to browse the skills catalog.
        </div>
      </GlassCard>
    );
  }

  if (loading && !data) {
    return (
      <GlassCard>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        </div>
      </GlassCard>
    );
  }

  if (error || !data) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <AlertTriangle size={14} className="text-amber-400" />
          Skills catalog unavailable{error ? `: ${error}` : ''}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Bundled Skills</h3>
        </div>
        <button
          onClick={() => setTab('skills')}
          className="text-[11px] px-3 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
        >
          Browse
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl px-3 py-2.5 bg-purple-500/10 border border-purple-500/20">
          <div className="text-2xl font-bold text-purple-400 tabular-nums">{data.totalSkills}</div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Total Skills</div>
        </div>
        <div className="rounded-xl px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            {data.totalCategories}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Categories</div>
        </div>
      </div>

      {data.topCategories.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Top Categories
          </div>
          <div className="space-y-1">
            {data.topCategories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 text-xs">
                <span className="text-[var(--text-secondary)] truncate flex-1">{cat.id}</span>
                <span className="text-[var(--text-muted)] tabular-nums">{cat.skillCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
