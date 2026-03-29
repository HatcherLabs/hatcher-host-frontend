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
  LayoutGrid,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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

export default function TemplateGalleryPage() {
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

  function handleDeployTemplate(templateId: string) {
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
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <LayoutGrid size={16} className="text-purple-400" />
              </div>
              <h1
                className="text-2xl font-bold text-white"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Template Gallery
              </h1>
            </div>
            <p className="text-[#A5A1C2] text-sm">
              {ENRICHED_TEMPLATES.length} pre-configured agents ready to deploy in one click.
            </p>
          </div>
          <Link
            href="/create"
            className="btn-primary text-sm flex-shrink-0"
          >
            <Bot size={15} />
            Deploy Custom Agent
          </Link>
        </motion.div>

        {/* ── Search ──────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="max-w-sm">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a]" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.4)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#71717a] outline-none focus:border-[#06b6d4]/50 transition-colors"
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
                      ? 'bg-[#06b6d4]/15 border border-[#06b6d4]/40 text-[#06b6d4] shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                      : 'border border-[rgba(46,43,74,0.4)] bg-[rgba(26,23,48,0.4)] text-[#71717a] hover:text-[#A5A1C2] hover:border-[rgba(46,43,74,0.7)]'
                  )}
                >
                  <Icon size={12} />
                  {label}
                  {count > 0 && (
                    <span className={cn(
                      'ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full',
                      isActive ? 'bg-[#06b6d4]/20 text-[#06b6d4]' : 'bg-[rgba(46,43,74,0.6)] text-[#71717a]'
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
              <Bot size={40} className="text-[#71717a] mb-4" />
              <h3 className="text-lg font-semibold text-white mb-1">No templates found</h3>
              <p className="text-sm text-[#A5A1C2]">Try a different search or category.</p>
            </motion.div>
          ) : (
            <motion.div
              key={activeCategory + searchQuery}
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {filteredTemplates.map(template => (
                <motion.div key={template.id} variants={itemVariants}>
                  <TemplateCard
                    template={template}
                    onUse={handleDeployTemplate}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer hint ─────────────────────────────────── */}
        <motion.p
          variants={itemVariants}
          className="text-center text-xs text-[#71717a]"
        >
          All templates are fully customizable after deployment &mdash; change the name, system prompt, model, and integrations at any time.
        </motion.p>

      </div>
    </motion.div>
  );
}
