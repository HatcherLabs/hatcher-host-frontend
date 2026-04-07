'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AGENT_TEMPLATES } from '@hatcher/shared';
import { TemplateCard } from '@/components/agents/TemplateCard';
import type { TemplateCardData } from '@/components/agents/TemplateCard';
import {
  Bot,
  Briefcase,
  Code2,
  FlaskConical,
  Headphones,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Category config ────────────────────────────────────────

const CATEGORIES = [
  { key: 'all',         label: 'All Templates', icon: Sparkles },
  { key: 'support',     label: 'Customer Support', icon: Headphones },
  { key: 'business',    label: 'Business', icon: Briefcase },
  { key: 'research',    label: 'Research', icon: FlaskConical },
  { key: 'crypto',      label: 'Trading & DeFi', icon: TrendingUp },
  { key: 'development', label: 'Development', icon: Code2 },
  { key: 'general',     label: 'General', icon: Bot },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

// ── Integration suggestions by category ───────────────────

const CATEGORY_INTEGRATIONS: Record<string, string[]> = {
  business:    ['Telegram', 'Slack', 'Discord', 'Web Chat'],
  development: ['Slack', 'Discord', 'Web Chat', 'Telegram'],
  crypto:      ['Telegram', 'Discord', 'Twitter/X', 'Web Chat'],
  research:    ['Telegram', 'Slack', 'Web Chat', 'Discord'],
  support:     ['Telegram', 'Slack', 'Discord', 'WhatsApp', 'Web Chat'],
  general:     ['Telegram', 'Discord', 'Web Chat'],
};

// ── Badge suggestions ─────────────────────────────────────

const POPULAR_IDS = ['customer-support', 'research-assistant', 'trading-analyst', 'dev-assistant', 'marketing-strategist'];
const NEW_IDS     = ['hermes-crypto-analyst', 'hermes-researcher', 'hermes-support-bot'];

function getBadge(id: string): string | undefined {
  if (POPULAR_IDS.includes(id)) return 'Popular';
  if (NEW_IDS.includes(id))     return 'New';
  return undefined;
}

// ── Framework suggestion by template ─────────────────────

function getSuggestedFramework(id: string): TemplateCardData['framework'] {
  if (id.startsWith('hermes-')) return 'hermes';
  if (['elizaos-', 'milady-'].some(p => id.startsWith(p))) return 'elizaos';
  return 'openclaw';
}

// ── Enrich AGENT_TEMPLATES into TemplateCardData ──────────

const ENRICHED_TEMPLATES: TemplateCardData[] = AGENT_TEMPLATES.map(t => ({
  id: t.id,
  name: t.name,
  icon: t.icon,
  category: t.category,
  description: t.description,
  personality: t.personality,
  defaultBio: t.defaultBio,
  defaultTopics: t.defaultTopics,
  defaultSystemPrompt: t.defaultSystemPrompt,
  integrations: CATEGORY_INTEGRATIONS[t.category] ?? ['Telegram', 'Discord', 'Web Chat'],
  badge: getBadge(t.id),
  framework: getSuggestedFramework(t.id),
}));

// ── Animation variants ────────────────────────────────────

const pageVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ── Page component ────────────────────────────────────────

export default function NewAgentPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = useMemo(() => {
    let result = ENRICHED_TEMPLATES;

    if (activeCategory !== 'all') {
      result = result.filter(t => t.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.defaultTopics ?? []).some(topic => topic.toLowerCase().includes(q))
      );
    }

    return result;
  }, [activeCategory, searchQuery]);

  function handleUseTemplate(templateId: string) {
    const framework = getSuggestedFramework(templateId);
    router.push(`/create?template=${templateId}&framework=${framework}`);
  }

  const counts: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = { all: ENRICHED_TEMPLATES.length };
    for (const t of ENRICHED_TEMPLATES) {
      map[t.category] = (map[t.category] ?? 0) + 1;
    }
    return map;
  }, []);

  return (
    <motion.div
      className="min-h-screen p-4 sm:p-6 lg:p-10"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ──────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="text-center max-w-2xl mx-auto">
          <h1
            className="text-3xl sm:text-4xl font-bold text-white mb-3"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            Choose a Template
          </h1>
          <p className="text-[var(--text-secondary)] text-sm sm:text-base">
            Start from a pre-configured template or build from scratch.
            Each template comes with a personality, system prompt, and suggested integrations.
          </p>
        </motion.div>

        {/* ── Search ──────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="max-w-sm mx-auto">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--color-accent)]/50 transition-colors"
            />
          </div>
        </motion.div>

        {/* ── Category tabs ──────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {CATEGORIES.map(({ key, label, icon: Icon }) => {
              const count = counts[key] ?? 0;
              const isActive = activeCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0',
                    isActive
                      ? 'bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/40 text-[var(--color-accent)] shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                      : 'border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                  )}
                >
                  <Icon size={12} />
                  {label}
                  {count > 0 && (
                    <span className={cn(
                      'ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full',
                      isActive ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'bg-[rgba(46,43,74,0.6)] text-[var(--text-muted)]'
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Template grid ───────────────────────────────── */}
        <AnimatePresence mode="wait">
          {filteredTemplates.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="card glass-noise flex flex-col items-center justify-center py-16 text-center"
            >
              <Bot size={40} className="text-[var(--text-muted)] mb-4" />
              <h3 className="text-lg font-semibold text-white mb-1">No templates found</h3>
              <p className="text-sm text-[var(--text-secondary)]">Try a different search or category.</p>
            </motion.div>
          ) : (
            <motion.div
              key={activeCategory + searchQuery}
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {/* Start from scratch card */}
              {activeCategory === 'all' && !searchQuery && (
                <motion.div variants={itemVariants}>
                  <motion.button
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => router.push('/create?template=custom')}
                    className="w-full h-full card glass-noise flex flex-col items-center justify-center gap-3 py-10 border-dashed border-[var(--border-default)] hover:border-[var(--color-accent)]/40 transition-all duration-200 group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[rgba(46,43,74,0.6)] border border-[var(--border-default)] flex items-center justify-center group-hover:bg-[var(--color-accent)]/10 group-hover:border-[var(--color-accent)]/30 transition-all duration-200">
                      <span className="text-2xl">+</span>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white group-hover:text-[var(--color-accent)] transition-colors">Start from Scratch</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">Full control over every setting</p>
                    </div>
                  </motion.button>
                </motion.div>
              )}

              {filteredTemplates.map(template => (
                <motion.div key={template.id} variants={itemVariants}>
                  <TemplateCard
                    template={template}
                    onUse={handleUseTemplate}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer hint ─────────────────────────────────── */}
        <motion.p
          variants={itemVariants}
          className="text-center text-xs text-[var(--text-muted)]"
        >
          All templates are fully customizable after deployment &mdash; change the name, system prompt, model, and integrations at any time.
        </motion.p>

      </div>
    </motion.div>
  );
}
