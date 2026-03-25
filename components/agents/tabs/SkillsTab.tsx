'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Sparkles,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Tag,
} from 'lucide-react';
import {
  useAgentContext,
  tabContentVariants,
  GlassCard,
  Skeleton,
} from '../AgentContext';
import { api } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  enabled: boolean;
}

// ─── Skill Card ──────────────────────────────────────────────

function SkillCard({
  skill,
  onToggle,
  toggling,
}: {
  skill: Skill;
  onToggle: (id: string, enabled: boolean) => void;
  toggling: string | null;
}) {
  const isToggling = toggling === skill.id;

  return (
    <GlassCard className="relative flex flex-col gap-3 transition-all duration-200 hover:border-white/[0.08]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">
            {skill.name}
          </h3>
          {skill.category && skill.category !== 'general' && (
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20">
              <Tag size={9} />
              {skill.category}
            </span>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggle(skill.id, !skill.enabled)}
          disabled={isToggling}
          className={`
            relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200
            ${skill.enabled
              ? 'bg-[#f97316] border border-[#f97316]/60'
              : 'bg-white/[0.08] border border-white/[0.12]'
            }
            ${isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:border-white/[0.2]'}
          `}
          title={skill.enabled ? 'Disable skill' : 'Enable skill'}
        >
          <span
            className={`
              absolute top-[3px] w-[18px] h-[18px] rounded-full transition-all duration-200 shadow-sm
              ${skill.enabled
                ? 'left-[21px] bg-white'
                : 'left-[3px] bg-[#71717a]'
              }
            `}
          />
          {isToggling && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={10} className="animate-spin text-white" />
            </span>
          )}
        </button>
      </div>

      {/* Description */}
      {skill.description ? (
        <p className="text-xs text-[#A5A1C2] leading-relaxed line-clamp-2">
          {skill.description}
        </p>
      ) : (
        <p className="text-xs text-[#71717a] italic">No description available</p>
      )}

      {/* Tags */}
      {skill.tags.length > 1 && (
        <div className="flex flex-wrap gap-1 mt-auto">
          {skill.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded text-[10px] text-[#71717a] bg-white/[0.03] border border-white/[0.04]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Status indicator */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-white/[0.04]">
        {skill.enabled ? (
          <>
            <Check size={11} className="text-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-medium">Enabled</span>
          </>
        ) : (
          <>
            <X size={11} className="text-[#71717a]" />
            <span className="text-[10px] text-[#71717a]">Disabled</span>
          </>
        )}
      </div>
    </GlassCard>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────

function SkillsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <GlassCard key={i} className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <div className="flex gap-1">
            <Skeleton className="h-4 w-12 rounded" />
            <Skeleton className="h-4 w-14 rounded" />
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function SkillsTab() {
  const { agent } = useAgentContext();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [restartHint, setRestartHint] = useState(false);

  const loadSkills = useCallback(async () => {
    if (!agent) return;
    setLoading(true);
    setError(null);
    const res = await api.getAgentSkills(agent.id);
    setLoading(false);
    if (res.success) {
      setSkills(res.data.skills);
      setMessage(res.data.message ?? null);
    } else {
      setError(res.error);
    }
  }, [agent]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleToggle = useCallback(async (skillId: string, enabled: boolean) => {
    if (!agent) return;
    setToggling(skillId);
    const res = await api.toggleAgentSkill(agent.id, skillId, enabled);
    setToggling(null);
    if (res.success) {
      setSkills(prev =>
        prev.map(s => (s.id === skillId ? { ...s, enabled } : s))
      );
      setRestartHint(true);
    }
  }, [agent]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    skills.forEach(s => {
      if (s.category && s.category !== 'general') cats.add(s.category);
    });
    return Array.from(cats).sort();
  }, [skills]);

  // Filter skills
  const filtered = useMemo(() => {
    let result = skills;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (categoryFilter) {
      result = result.filter(s => s.category === categoryFilter);
    }
    return result;
  }, [skills, search, categoryFilter]);

  const enabledCount = skills.filter(s => s.enabled).length;

  if (!agent) return null;

  return (
    <motion.div
      key="skills"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles size={18} className="text-[#f97316]" />
            Skills Browser
          </h2>
          <p className="text-xs text-[#71717a] mt-0.5">
            {skills.length > 0
              ? `${skills.length} available / ${enabledCount} enabled`
              : 'Discover and enable skills for your agent'}
          </p>
        </div>
        <button
          onClick={loadSkills}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] border border-white/[0.06] text-[#A5A1C2] hover:bg-white/[0.08] transition-colors disabled:opacity-50"
        >
          <RotateCcw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Restart hint */}
      {restartHint && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#f97316]/10 border border-[#f97316]/20">
          <AlertTriangle size={14} className="text-[#f97316] flex-shrink-0" />
          <p className="text-xs text-[#f97316]">
            Restart the agent for skill changes to take effect.
          </p>
          <button
            onClick={() => setRestartHint(false)}
            className="ml-auto text-[#f97316]/60 hover:text-[#f97316] transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Container not running message */}
      {!loading && message && skills.length === 0 && (
        <GlassCard className="flex flex-col items-center justify-center py-10 text-center">
          <AlertTriangle size={32} className="text-[#71717a] mb-3" />
          <p className="text-sm text-[#A5A1C2]">{message}</p>
          <p className="text-xs text-[#71717a] mt-1">
            Start the agent to browse available skills.
          </p>
        </GlassCard>
      )}

      {/* Error */}
      {error && (
        <GlassCard className="flex items-center gap-3 border-red-500/20">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </GlassCard>
      )}

      {/* Loading */}
      {loading && <SkillsSkeleton />}

      {/* Skills grid */}
      {!loading && skills.length > 0 && (
        <>
          {/* Search + filter bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search skills..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white/[0.04] border border-white/[0.06] text-white placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/40 transition-colors"
              />
            </div>

            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setCategoryFilter(null)}
                  className={`px-2.5 py-1.5 text-[10px] font-medium rounded-lg transition-colors ${
                    !categoryFilter
                      ? 'bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/30'
                      : 'bg-white/[0.04] text-[#71717a] border border-white/[0.06] hover:bg-white/[0.08]'
                  }`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                    className={`px-2.5 py-1.5 text-[10px] font-medium rounded-lg transition-colors capitalize ${
                      categoryFilter === cat
                        ? 'bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/30'
                        : 'bg-white/[0.04] text-[#71717a] border border-white/[0.06] hover:bg-white/[0.08]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onToggle={handleToggle}
                  toggling={toggling}
                />
              ))}
            </div>
          ) : (
            <GlassCard className="flex flex-col items-center justify-center py-8 text-center">
              <Search size={24} className="text-[#71717a] mb-2" />
              <p className="text-sm text-[#A5A1C2]">No skills match your search</p>
              <button
                onClick={() => { setSearch(''); setCategoryFilter(null); }}
                className="mt-2 text-xs text-[#f97316] hover:text-[#fb923c] transition-colors"
              >
                Clear filters
              </button>
            </GlassCard>
          )}
        </>
      )}

      {/* Empty state — container running but no skills */}
      {!loading && !message && !error && skills.length === 0 && (
        <GlassCard className="flex flex-col items-center justify-center py-10 text-center">
          <Sparkles size={32} className="text-[#71717a] mb-3" />
          <p className="text-sm text-[#A5A1C2]">No skills found</p>
          <p className="text-xs text-[#71717a] mt-1">
            This agent&apos;s container does not have any skills installed.
          </p>
        </GlassCard>
      )}
    </motion.div>
  );
}
