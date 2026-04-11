'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Search, Info, ChevronRight, RefreshCw, AlertTriangle, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useAgentContext, tabContentVariants, GlassCard, Skeleton } from '../AgentContext';

interface HermesSkillMetadata {
  name?: string;
  description?: string;
  version?: string;
  author?: string;
  platforms?: string[];
  tags?: string[];
}

interface HermesSkill {
  id: string;
  category: string;
  path: string;
  skillMdPath: string;
  metadata: HermesSkillMetadata;
}

interface HermesCategory {
  id: string;
  description: string;
  skillCount: number;
}

/**
 * Hermes bundled-skills browser. Walks the `skills/` directory in the
 * managed-mode volume via `GET /agents/:id/hermes-skills` and shows
 * categories, per-skill metadata, and search. This mirrors what
 * MiladySkillsTab does for Milady, but the data shape is different —
 * Hermes groups skills by category folder with a DESCRIPTION.md per
 * category and a SKILL.md per individual skill.
 *
 * Only useful for managed-mode Hermes agents; the backend route returns
 * a validation error for legacy hermes agents and the UI renders a
 * friendly notice in that case.
 */
export function HermesSkillsTab() {
  const { agent, setTab } = useAgentContext();
  const [skills, setSkills] = useState<HermesSkill[]>([]);
  const [categories, setCategories] = useState<HermesCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getHermesSkills(agent.id);
      if (res.success) {
        setSkills(res.data.skills);
        setCategories(res.data.categories);
      } else {
        setError('error' in res ? res.error : 'Failed to load skills');
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

  // Filter skills by search query + selected category
  const filtered = useMemo(() => {
    let list = skills;
    if (selectedCategory) {
      list = list.filter((s) => s.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => {
        return (
          s.id.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.metadata.name ?? '').toLowerCase().includes(q) ||
          (s.metadata.description ?? '').toLowerCase().includes(q) ||
          (s.metadata.tags ?? []).some((t) => t.toLowerCase().includes(q))
        );
      });
    }
    return list;
  }, [skills, search, selectedCategory]);

  // Sort categories by count desc for the sidebar
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => b.skillCount - a.skillCount);
  }, [categories]);

  if (agent && agent.managementMode !== 'managed') {
    return (
      <motion.div
        key="tab-hermes-skills"
        variants={tabContentVariants}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <GlassCard>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Info size={14} className="text-amber-400" />
            Hermes skills browser is only available for managed-mode agents.
            Legacy hermes agents can still chat and use tools but don&apos;t
            expose the bundled skills catalog.
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="tab-hermes-skills"
      className="space-y-4"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      {/* Header — stats + refresh */}
      <GlassCard>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Sparkles size={18} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Bundled Skills</h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              {loading
                ? 'Loading catalog...'
                : `${skills.length} skill${skills.length === 1 ? '' : 's'} across ${categories.length} categor${
                    categories.length === 1 ? 'y' : 'ies'
                  }`}
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              void load();
            }}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-white/10 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>
      </GlassCard>

      {error && !loading && (
        <GlassCard>
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertTriangle size={14} />
            {error}
          </div>
        </GlassCard>
      )}

      {loading && skills.length === 0 ? (
        <GlassCard>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          {/* Category sidebar */}
          <GlassCard className="!p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-default)]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Categories
              </h3>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                  selectedCategory === null
                    ? 'bg-purple-500/10 text-purple-400'
                    : 'hover:bg-[var(--bg-card)] text-[var(--text-secondary)]'
                }`}
              >
                <span className="text-xs font-medium">All</span>
                <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                  {skills.length}
                </span>
              </button>
              {sortedCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() =>
                    setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
                  }
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors cursor-pointer border-t border-[var(--border-default)] ${
                    selectedCategory === cat.id
                      ? 'bg-purple-500/10 text-purple-400'
                      : 'hover:bg-[var(--bg-card)] text-[var(--text-secondary)]'
                  }`}
                  title={cat.description}
                >
                  <span className="text-xs capitalize truncate">{cat.id}</span>
                  <span className="text-[10px] text-[var(--text-muted)] tabular-nums ml-2">
                    {cat.skillCount}
                  </span>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Skills list */}
          <div className="space-y-3">
            {/* Search */}
            <GlassCard className="!p-3">
              <div className="flex items-center gap-2">
                <Search size={14} className="text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${selectedCategory ? `in ${selectedCategory}` : 'skills'}...`}
                  className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
                  >
                    clear
                  </button>
                )}
              </div>
            </GlassCard>

            {/* Results */}
            {filtered.length === 0 ? (
              <GlassCard>
                <div className="text-center py-8 text-sm text-[var(--text-muted)]">
                  {search.trim() || selectedCategory
                    ? 'No skills match your filters.'
                    : 'No skills found in this agent\'s workspace.'}
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="!p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {filtered.length} result{filtered.length === 1 ? '' : 's'}
                  </span>
                  {(search.trim() || selectedCategory) && (
                    <button
                      onClick={() => {
                        setSearch('');
                        setSelectedCategory(null);
                      }}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="max-h-[60vh] overflow-y-auto divide-y divide-[var(--border-default)]">
                  {filtered.map((skill) => (
                    <HermesSkillRow
                      key={skill.skillMdPath}
                      skill={skill}
                      onViewWorkspace={() => setTab('workspace')}
                    />
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function HermesSkillRow({
  skill,
  onViewWorkspace,
}: {
  skill: HermesSkill;
  onViewWorkspace: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const name = skill.metadata.name ?? skill.id;
  const description = skill.metadata.description ?? '';
  const tags = skill.metadata.tags ?? [];
  const platforms = skill.metadata.platforms ?? [];

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-default)] capitalize">
              {skill.category}
            </span>
            {skill.metadata.version && (
              <span className="text-[9px] font-mono text-[var(--text-muted)]">
                v{skill.metadata.version}
              </span>
            )}
          </div>
          {description && (
            <p
              className={`text-xs text-[var(--text-secondary)] mt-1 leading-relaxed ${
                expanded ? '' : 'line-clamp-2'
              }`}
            >
              {description}
            </p>
          )}
          {expanded && (
            <div className="mt-3 space-y-2">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              {platforms.length > 0 && (
                <div className="text-[10px] text-[var(--text-muted)]">
                  Platforms: {platforms.join(', ')}
                </div>
              )}
              {skill.metadata.author && (
                <div className="text-[10px] text-[var(--text-muted)]">
                  Author: {skill.metadata.author}
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={onViewWorkspace}
                  className="text-[10px] px-2 py-1 rounded-lg border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/5 text-[var(--text-muted)] hover:text-purple-400 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <FileText size={11} />
                  View SKILL.md in Workspace
                </button>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {skill.path}
                </span>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-1 cursor-pointer flex-shrink-0"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <ChevronRight
            size={14}
            className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </button>
      </div>
    </div>
  );
}
