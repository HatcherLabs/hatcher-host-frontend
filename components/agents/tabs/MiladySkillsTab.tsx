'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, RotateCcw, Info, Search, Check } from 'lucide-react';
import { api } from '@/lib/api';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
} from '../AgentContext';

interface MiladySkill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export function MiladySkillsTab() {
  const { agent } = useAgentContext();
  const [skills, setSkills] = useState<MiladySkill[]>([]);
  const [total, setTotal] = useState(0);
  const [enabled, setEnabled] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMiladySkills(agent.id);
      if (res.success) {
        setSkills(res.data.skills);
        setTotal(res.data.total);
        setEnabled(res.data.enabled);
      } else {
        setError(res.error || 'Failed to load skills');
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return skills;
    const q = search.toLowerCase();
    return skills.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [skills, search]);

  return (
    <motion.div
      key="tab-skills-milady"
      className="space-y-4"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-rose-400" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">Milady Skills</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all flex items-center gap-1.5"
        >
          <RotateCcw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 flex items-start gap-3">
        <Info size={16} className="text-rose-400/70 mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed text-rose-400">
          Milady ships with a built-in skill catalog. These are CLI-backed capabilities the agent can invoke — they&apos;re automatically loaded into the agent&apos;s context. Browse to see what your agent can do.
        </p>
      </div>

      {!loading && !error && skills.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]">
              <Search size={14} className="text-[var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search skills..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-[var(--text-muted)] outline-none"
              />
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {filtered.length === total ? `${total} total` : `${filtered.length} / ${total}`}
              <span className="mx-1">·</span>
              <span className="text-rose-400">{enabled} enabled</span>
            </div>
          </div>
        </>
      )}

      {loading ? (
        <GlassCard>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </GlassCard>
      ) : error ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Sparkles size={24} className="text-red-400/50" />
            <p className="text-sm text-red-400">{error}</p>
            <p className="text-xs text-[var(--text-muted)]">Is the agent running?</p>
          </div>
        </GlassCard>
      ) : skills.length === 0 ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Sparkles size={28} className="text-rose-400 mb-3" />
            <p className="text-base font-semibold text-white mb-1">No skills loaded</p>
            <p className="text-sm text-[var(--text-muted)]">Milady hasn&apos;t reported any skills yet.</p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <GlassCard key={s.id} className="!p-4">
              <div className="flex items-start gap-3">
                {s.enabled ? (
                  <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} className="text-rose-300" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border border-[var(--border-default)] shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{s.id}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{s.description}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </motion.div>
  );
}
