'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Brain, User, BookOpen, Tag, RefreshCw, AlertTriangle, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '@/lib/api';
import { useAgentContext, tabContentVariants, GlassCard, Skeleton } from '../AgentContext';

interface MemorySection {
  name: string;
  content: string;
}

/**
 * Hermes-native memory browser. Reuses the existing
 * `/agents/:id/memory` endpoint (files.ts handles the Hermes layout
 * already: root = /home/hermes/.hermes/memories, memoryMd = MEMORY.md,
 * extraFiles = USER.md + SOUL.md, plus any other .md files in the
 * directory as "daily logs"). The data shape is the same as the
 * generic MemoryTab — we just re-render it with Hermes-specific
 * sectioning.
 *
 * Hermes's memory model has three canonical buckets that deserve
 * their own headers instead of the generic MemoryTab's
 * "MEMORY.md + random logs" layout:
 *   - SOUL.md   = persona / identity block (seeded at init)
 *   - MEMORY.md = stable agent, environment, and workflow facts
 *   - USER.md   = stable user context and preferences
 * Plus: any additional .md files inside memories/ are treated as
 * tag-based memories and rendered below with their filenames.
 *
 * Keeping the buckets separate makes the memory browser easier to
 * audit without embedding framework-specific prompt rules in the UI.
 */
export function HermesMemoryTab() {
  const { agent } = useAgentContext();
  const [sections, setSections] = useState<Record<string, string>>({});
  const [tagged, setTagged] = useState<MemorySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);

  const load = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAgentMemory(agent.id);
      if (res.success) {
        const data = res.data;
        if (data.status === 'stopped') {
          setStopped(true);
          return;
        }
        setStopped(false);
        // Backend returns memoryMd = MEMORY.md content, and dailyLogs
        // with the named files (USER.md, SOUL.md) + any other .md
        // files. Split them into canonical sections vs tagged.
        const byName: Record<string, string> = {};
        if (data.memoryMd) byName.MEMORY = data.memoryMd;
        const taggedList: MemorySection[] = [];
        for (const log of data.dailyLogs ?? []) {
          const nameUpper = log.date.toUpperCase();
          if (nameUpper === 'USER' || nameUpper === 'SOUL') {
            byName[nameUpper] = log.content;
          } else {
            taggedList.push({ name: log.date, content: log.content });
          }
        }
        setSections(byName);
        setTagged(taggedList);
      } else {
        setError('error' in res ? res.error : 'Failed to load memories');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const hasContent = useMemo(() => {
    return (
      Boolean(sections.SOUL) ||
      Boolean(sections.MEMORY) ||
      Boolean(sections.USER) ||
      tagged.length > 0
    );
  }, [sections, tagged]);

  if (stopped) {
    return (
      <motion.div
        key="tab-hermes-memory"
        variants={tabContentVariants}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <GlassCard>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <AlertTriangle size={14} className="text-[var(--color-warning)]" />
            Agent is stopped. Start it to read live memories.
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="tab-hermes-memory"
      className="space-y-4"
      variants={tabContentVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      {/* Header */}
      <GlassCard>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--tech-accent-soft)] flex items-center justify-center">
            <Brain size={18} className="text-[var(--accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Memory</h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Hermes keeps three buckets: <strong>SOUL</strong> (persona),{' '}
              <strong>MEMORY</strong> (agent self-facts), and <strong>USER</strong> (human
              facts). Extra tagged entries show at the bottom.
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              void load();
            }}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-[var(--border-default)] hover:border-[var(--border-hover)] hover:bg-[var(--tech-accent-soft)] transition-all text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>
      </GlassCard>

      {error && !loading && (
        <GlassCard>
          <div className="flex items-center gap-2 text-sm text-[var(--color-destructive)]">
            <AlertTriangle size={14} />
            {error}
          </div>
        </GlassCard>
      )}

      {loading && !hasContent ? (
        <GlassCard>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </GlassCard>
      ) : !hasContent ? (
        <GlassCard>
          <div className="text-center py-10 px-4">
            <BookOpen size={22} className="mx-auto text-[var(--text-muted)] mb-2" />
            <p className="text-sm text-[var(--text-muted)]">No memories yet.</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              The agent will write here as it learns.
            </p>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* SOUL — persona */}
          {sections.SOUL && (
            <MemoryCanonSection
              title="SOUL.md"
              subtitle="Persona / identity block seeded at agent init"
              icon={<Sparkles size={14} className="text-[var(--color-warning)]" />}
              accent="soul"
              content={sections.SOUL}
            />
          )}

          {/* MEMORY.md */}
          {sections.MEMORY ? (
            <MemoryCanonSection
              title="MEMORY.md"
              subtitle="Facts the agent has learned about ITSELF"
              icon={<Brain size={14} className="text-[var(--accent)]" />}
              accent="memory"
              content={sections.MEMORY}
            />
          ) : (
            <GlassCard>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Brain size={12} className="text-[var(--accent)]" />
                <span>
                  <strong>MEMORY.md</strong> is empty. The agent writes here
                  as it learns facts about itself.
                </span>
              </div>
            </GlassCard>
          )}

          {/* USER.md */}
          {sections.USER ? (
            <MemoryCanonSection
              title="USER.md"
              subtitle="Facts the agent has learned about you"
              icon={<User size={14} className="text-[var(--color-info)]" />}
              accent="user"
              content={sections.USER}
            />
          ) : (
            <GlassCard>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <User size={12} className="text-[var(--color-info)]" />
                <span>
                  <strong>USER.md</strong> is empty. Chat with the agent
                  (&quot;my name is ...&quot;, &quot;I prefer ...&quot;) to
                  populate it.
                </span>
              </div>
            </GlassCard>
          )}

          {/* Tagged memories */}
          {tagged.length > 0 && (
            <GlassCard className="!p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-default)] flex items-center gap-2">
                <Tag size={14} className="text-[var(--color-accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
                  Tagged memories
                </h3>
                <span className="text-[10px] text-[var(--text-muted)]">({tagged.length})</span>
              </div>
              <div className="divide-y divide-[var(--border-default)]">
                {tagged.map((mem) => (
                  <TaggedMemoryRow key={mem.name} memory={mem} />
                ))}
              </div>
            </GlassCard>
          )}
        </>
      )}
    </motion.div>
  );
}

const ACCENT_CLASSES: Record<string, { border: string; bg: string; iconBg: string }> = {
  soul: { border: 'border-[var(--color-warning-border)]', bg: 'bg-[var(--color-warning-bg)]', iconBg: 'bg-[var(--color-warning-bg)]' },
  memory: {
    border: 'border-[var(--border-hover)]',
    bg: 'bg-[var(--tech-accent-soft)]',
    iconBg: 'bg-[var(--tech-accent-soft)]',
  },
  user: { border: 'border-[var(--color-info-border)]', bg: 'bg-[var(--color-info-bg)]', iconBg: 'bg-[var(--color-info-bg)]' },
};

function MemoryCanonSection({
  title,
  subtitle,
  icon,
  accent,
  content,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: 'soul' | 'memory' | 'user';
  content: string;
}) {
  const classes = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.memory!;
  return (
    <div
      className={`rounded-2xl border ${classes.border} ${classes.bg} overflow-hidden`}
    >
      <div className="px-5 py-3 border-b border-[var(--border-default)] flex items-center gap-2">
        <div
          className={`w-7 h-7 rounded-lg ${classes.iconBg} flex items-center justify-center flex-shrink-0`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] font-mono">{title}</h3>
          <p className="text-[10px] text-[var(--text-muted)]">{subtitle}</p>
        </div>
      </div>
      <div className="px-5 py-4 markdown-body text-[13px] text-[var(--text-secondary)] leading-relaxed max-h-[40vh] overflow-y-auto">
        <ReactMarkdown skipHtml>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

function TaggedMemoryRow({ memory }: { memory: MemorySection }) {
  const [expanded, setExpanded] = useState(false);
  const preview = memory.content.slice(0, 120).replace(/\n/g, ' ').trim();
  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={`Memory ${memory.name}.md`}
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3 text-left flex items-center gap-2 hover:bg-[var(--bg-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset transition-colors cursor-pointer"
      >
        {expanded ? (
          <ChevronDown size={12} className="text-[var(--text-muted)] flex-shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-[var(--text-muted)] flex-shrink-0" />
        )}
        <span className="text-xs font-semibold font-mono text-[var(--text-primary)]">
          {memory.name}.md
        </span>
        {!expanded && preview && (
          <span className="text-[11px] text-[var(--text-muted)] italic truncate flex-1 ml-2">
            {preview}
            {memory.content.length > 120 && '…'}
          </span>
        )}
      </button>
      {expanded && (
        <div className="px-5 pb-4 markdown-body text-[12px] text-[var(--text-secondary)] leading-relaxed">
          <ReactMarkdown skipHtml>{memory.content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
