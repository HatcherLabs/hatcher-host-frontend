'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AGENT_TEMPLATES } from '@hatcher/shared';
import { cn } from '@/lib/utils';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';

// ── Category config ─────────────────────────────────────────
type Category = 'all' | 'business' | 'development' | 'crypto' | 'research' | 'support' | 'general';

const CATEGORY_CONFIG: Record<Category, { label: string; color: string; glow: string }> = {
  all:         { label: 'All',         color: 'bg-white/[0.06] text-white border-white/[0.08]',             glow: '' },
  business:    { label: 'Business',    color: 'bg-blue-500/10 text-blue-400 border-blue-500/25',             glow: 'rgba(59,130,246,0.08)' },
  development: { label: 'Development', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',    glow: 'rgba(16,185,129,0.08)' },
  crypto:      { label: 'Crypto',      color: 'bg-amber-500/10 text-amber-400 border-amber-500/25',          glow: 'rgba(245,158,11,0.08)' },
  research:    { label: 'Research',    color: 'bg-purple-500/10 text-purple-400 border-purple-500/25',       glow: 'rgba(139,92,246,0.08)' },
  support:     { label: 'Support',     color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',             glow: 'rgba(6,182,212,0.08)' },
  general:     { label: 'General',     color: 'bg-rose-500/10 text-rose-400 border-rose-500/25',             glow: 'rgba(244,63,94,0.08)' },
};

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as Category[];

// ── Animation variants ───────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ── Template card ────────────────────────────────────────────
function TemplateCard({ template, index }: { template: typeof AGENT_TEMPLATES[number]; index: number }) {
  const catKey = (template.category || 'general') as Category;
  const cat = CATEGORY_CONFIG[catKey] ?? CATEGORY_CONFIG.general;

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="group relative flex flex-col rounded-2xl border border-white/[0.06] bg-[rgba(14,14,20,0.7)] backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-white/[0.12]"
      style={{
        boxShadow: '0 0 0 0 transparent',
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, transparent, ${cat.glow ? cat.glow.replace('0.08)', '0.4)') : 'rgba(139,92,246,0.4)'}, transparent)` }}
      />

      <div className="p-5 flex flex-col h-full">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl leading-none select-none">{template.icon}</span>
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide', cat.color)}>
            {cat.label}
          </span>
        </div>

        {/* Name */}
        <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-purple-200 transition-colors duration-200">
          {template.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-[#71717a] leading-relaxed mb-3 flex-1">
          {template.description}
        </p>

        {/* Topics */}
        {template.defaultTopics && template.defaultTopics.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {template.defaultTopics.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-[#52525b] border border-white/[0.04]"
              >
                {topic}
              </span>
            ))}
            {template.defaultTopics.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-[#52525b] border border-white/[0.04]">
                +{template.defaultTopics.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Deploy button */}
        <Link
          href={`/create?template=${template.id}`}
          className="flex items-center justify-center gap-1.5 w-full h-8 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all duration-200 group/btn"
        >
          <Zap className="w-3 h-3 group-hover/btn:text-yellow-300 transition-colors" />
          Deploy
          <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-200" />
        </Link>
      </div>
    </motion.div>
  );
}

// All non-custom templates
const ALL_TEMPLATES = AGENT_TEMPLATES.filter(t => (t.id as string) !== 'custom');

// ── Main page ────────────────────────────────────────────────
export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  const filtered = activeCategory === 'all'
    ? ALL_TEMPLATES
    : ALL_TEMPLATES.filter(t => t.category === activeCategory);

  const totalCount = ALL_TEMPLATES.length;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-white">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(139,92,246,0.08), transparent 60%)',
      }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-medium text-purple-300">{totalCount} ready-to-deploy templates</span>
          </div>

          <h1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            Agent Templates
          </h1>
          <p className="text-[#a1a1aa] text-lg max-w-xl mx-auto leading-relaxed">
            Pick a pre-built agent and deploy in 60 seconds. Every template is fully customizable.
          </p>
        </motion.div>

        {/* ── Category filter tabs ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {CATEGORIES.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const count = cat === 'all'
              ? totalCount
              : ALL_TEMPLATES.filter(t => t.category === cat).length;
            if (count === 0 && cat !== 'all') return null;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                  activeCategory === cat
                    ? cat === 'all'
                      ? 'bg-purple-500/20 text-white border-purple-500/40'
                      : cfg.color.replace('/10', '/20').replace('/25', '/50')
                    : 'bg-transparent text-[#71717a] border-white/[0.06] hover:border-white/[0.12] hover:text-white'
                )}
              >
                {cfg.label}
                <span className="ml-1.5 opacity-50 text-[10px]">{count}</span>
              </button>
            );
          })}
        </motion.div>

        {/* ── Template grid ── */}
        <motion.div
          key={activeCategory}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filtered.map((template, i) => (
            <TemplateCard key={template.id} template={template} index={i} />
          ))}
        </motion.div>

        {/* ── Custom agent CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 rounded-2xl border border-white/[0.06] bg-[rgba(14,14,20,0.5)] p-8 text-center"
        >
          <span className="text-3xl mb-3 block">⚙️</span>
          <h2 className="text-lg font-bold text-white mb-2">Build from scratch</h2>
          <p className="text-sm text-[#71717a] mb-5 max-w-md mx-auto">
            Don&apos;t see what you need? Start with a blank canvas and write your own system prompt.
          </p>
          <Link
            href="/create?template=custom"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-sm font-medium text-white transition-all duration-200"
          >
            Custom Agent
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
