'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  Zap,
  Database,
  Shield,
  Megaphone,
  ShoppingCart,
  GraduationCap,
  DollarSign,
  Heart,
  Users,
  Scale,
  Cpu,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── ApiTemplate (from /api/templates) ─────────────────────

interface ApiTemplate {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  personality: string;
  topics: string[];
  suggestedSkills: string[];
}

// ── Category icon map ──────────────────────────────────────

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'all':              Sparkles,
  'automation':       Zap,
  'business':         Briefcase,
  'compliance':       Scale,
  'creative':         Sparkles,
  'customer-success': Headphones,
  'data':             Database,
  'development':      Code2,
  'devops':           Cpu,
  'ecommerce':        ShoppingCart,
  'education':        GraduationCap,
  'finance':          DollarSign,
  'freelance':        Briefcase,
  'healthcare':       Heart,
  'hr':               Users,
  'legal':            Scale,
  'marketing':        Megaphone,
  'moltbook':         Bot,
  'personal':         Bot,
  'productivity':     Zap,
  'real-estate':      Bot,
  'saas':             Bot,
  'security':         Shield,
  'supply-chain':     Package,
  'voice':            Bot,
  'ollama':           Bot,
  'research':         FlaskConical,
  'support':          Headphones,
  'crypto':           TrendingUp,
  'general':          Bot,
};

function getCategoryIcon(key: string): React.ComponentType<{ size?: number; className?: string }> {
  return CATEGORY_ICON_MAP[key] ?? Bot;
}

function getCategoryLabel(key: string): string {
  if (key === 'all') return 'All Templates';
  return key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ── Integration suggestions by category ───────────────────

const CATEGORY_INTEGRATIONS: Record<string, string[]> = {
  business:          ['Telegram', 'Slack', 'Discord', 'Web Chat'],
  development:       ['Slack', 'Discord', 'Web Chat', 'Telegram'],
  crypto:            ['Telegram', 'Discord', 'Twitter/X', 'Web Chat'],
  research:          ['Telegram', 'Slack', 'Web Chat', 'Discord'],
  support:           ['Telegram', 'Slack', 'Discord', 'WhatsApp', 'Web Chat'],
  'customer-success':['Telegram', 'Slack', 'Discord', 'WhatsApp', 'Web Chat'],
  general:           ['Telegram', 'Discord', 'Web Chat'],
  marketing:         ['Telegram', 'Discord', 'Twitter/X', 'Web Chat'],
  finance:           ['Telegram', 'Slack', 'Discord', 'Web Chat'],
  education:         ['Telegram', 'Discord', 'Web Chat'],
  healthcare:        ['Telegram', 'Web Chat'],
  hr:                ['Slack', 'Web Chat', 'Telegram'],
  legal:             ['Slack', 'Web Chat', 'Telegram'],
  ecommerce:         ['Telegram', 'WhatsApp', 'Web Chat'],
};

// ── Badge suggestions ─────────────────────────────────────

const POPULAR_IDS = ['customer-support', 'research-assistant', 'trading-analyst', 'dev-assistant', 'marketing-strategist'];
const NEW_IDS     = ['hermes-crypto-analyst', 'hermes-researcher', 'hermes-support-bot'];

function getBadge(id: string): string | undefined {
  if (POPULAR_IDS.includes(id)) return 'Popular';
  if (NEW_IDS.includes(id))     return 'New';
  return undefined;
}

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
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [rawTemplates, setRawTemplates] = useState<ApiTemplate[]>([]);
  const [apiCategories, setApiCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  useEffect(() => {
    void fetch(`${apiUrl}/api/templates?limit=200`)
      .then(r => r.json() as Promise<{ templates: ApiTemplate[]; categories: string[] }>)
      .then(data => {
        setRawTemplates(data.templates);
        setApiCategories(data.categories);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiUrl]);

  const enrichedTemplates = useMemo<TemplateCardData[]>(() => (
    rawTemplates.map(t => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      category: t.category,
      description: t.description,
      personality: t.personality,
      defaultTopics: t.topics,
      integrations: CATEGORY_INTEGRATIONS[t.category] ?? ['Telegram', 'Discord', 'Web Chat'],
      badge: getBadge(t.id),
      framework: 'openclaw' as const,
    }))
  ), [rawTemplates]);

  const filteredTemplates = useMemo(() => {
    let result = enrichedTemplates;

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
  }, [activeCategory, searchQuery, enrichedTemplates]);

  function handleUseTemplate(templateId: string) {
    router.push(`/create?template=${templateId}&framework=openclaw`);
  }

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: enrichedTemplates.length };
    for (const t of enrichedTemplates) {
      map[t.category] = (map[t.category] ?? 0) + 1;
    }
    return map;
  }, [enrichedTemplates]);

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
            {['all', ...apiCategories.sort()].map((key) => {
              const Icon = getCategoryIcon(key);
              const label = getCategoryLabel(key);
              const count = counts[key] ?? 0;
              if (count === 0 && key !== 'all') return null;
              const isActive = activeCategory === key;
              return (
                <motion.button
                  key={key}
                  variants={itemVariants}
                  onClick={() => setActiveCategory(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border whitespace-nowrap transition-all duration-200',
                    isActive
                      ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/40 text-[var(--color-accent)]'
                      : 'bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border-hover)]'
                  )}
                >
                  <Icon size={12} />
                  {label}
                  <span className="opacity-50">{count}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Template grid ───────────────────────────────── */}
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] animate-pulse" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
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
