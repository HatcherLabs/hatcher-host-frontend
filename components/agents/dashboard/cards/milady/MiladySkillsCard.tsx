'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Power, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, GlassCard, Skeleton } from '../../../AgentContext';

interface SkillEntry {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface SkillsData {
  total: number;
  enabled: number;
  skills: SkillEntry[];
}

/**
 * Milady skills panel — 78-ish bundled skills, with count summary
 * and a short list of currently-enabled ones. Links to the Skills
 * tab for the full catalog + toggles.
 */
export function MiladySkillsCard() {
  const { agent, setTab } = useAgentContext();
  const isActive = agent.status === 'active';
  const [data, setData] = useState<SkillsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSkills = useCallback(async () => {
    if (!isActive) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.getMiladySkills(agent.id);
      if (res.success) {
        setData(res.data);
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
          <Sparkles size={14} className="text-rose-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Skills</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Power size={12} />
          Start the agent to browse skills.
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

  const enabledSkills = data.skills.filter((s) => s.enabled).slice(0, 8);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-rose-400" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Skills</h3>
          <span className="text-[10px] text-[var(--text-muted)]">
            ({data.enabled} enabled / {data.total} available)
          </span>
        </div>
        <button
          onClick={() => setTab('skills')}
          className="text-[11px] px-3 py-1 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
        >
          Manage
        </button>
      </div>

      {data.enabled === 0 ? (
        <div className="text-[11px] text-[var(--text-muted)] italic">
          No skills currently enabled. Visit the Skills tab to turn some on.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {enabledSkills.map((skill) => (
            <span
              key={skill.id}
              title={skill.description || skill.name}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium"
            >
              {skill.name}
            </span>
          ))}
          {data.enabled > enabledSkills.length && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-default)]">
              +{data.enabled - enabledSkills.length} more
            </span>
          )}
        </div>
      )}
    </GlassCard>
  );
}
