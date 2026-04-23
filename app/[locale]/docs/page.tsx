'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/routing';
import {
  Rocket,
  Bot,
  Globe,
  KeyRound,
  CreditCard,
  Code,
  Search,
  ExternalLink,
  HelpCircle,
  LifeBuoy,
  ArrowRight,
  BookOpen,
  Plug,
  Zap,
} from 'lucide-react';
import { DOCS_URL } from '@/lib/config';

// ── Animation variants ─────────────────────────────────────────

const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ── Quick link icons + hrefs (titles/descriptions come from i18n) ──
const QUICK_LINKS_ICONS = [
  { icon: Rocket, href: '/getting-started', color: 'var(--color-accent)' },
  { icon: Bot, href: '/agent-configuration', color: '#22d3ee' },
  { icon: Globe, href: '/integrations', color: '#a78bfa' },
  { icon: KeyRound, href: '/byok', color: '#4ade80' },
  { icon: CreditCard, href: '/billing', color: '#fbbf24' },
  { icon: Code, href: '/api-reference', color: '#f87171' },
];

// ── Page ────────────────────────────────────────────────────────

export default function DocsPage() {
  const t = useTranslations('docs');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-5xl">

        {/* ── Hero ─────────────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 px-4 py-1.5 text-sm font-medium text-[var(--color-accent)]">
            <BookOpen className="h-4 w-4" />
            {t('eyebrow')}
          </div>
          <h1 className="font-[var(--font-display)] text-4xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl">
            {t('heading')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--text-secondary)]">
            {t('subheading')}
          </p>
        </motion.div>

        {/* ── Search bar (cosmetic) ────────────────────────── */}
        <motion.div variants={cardVariants} className="mx-auto mb-12 max-w-xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] py-3 pl-12 pr-4 text-[var(--text-primary)] placeholder-[#6B6890] outline-none transition-all duration-200 focus:border-[var(--color-accent)]/40 focus:ring-2 focus:ring-[var(--color-accent)]/10"
            />
            {searchQuery && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                {t('searchComingSoon')}
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Featured internal pages ────────────────────────── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mb-10 grid gap-4 sm:grid-cols-2"
        >
          <motion.div variants={staggerItem}>
            <Link
              href="/docs/api"
              className="group relative flex items-start gap-4 rounded-2xl border border-[var(--color-accent)]/20 bg-[var(--bg-elevated)] p-6 backdrop-blur-xl transition-all duration-200 hover:border-[var(--color-accent)]/40 hover:shadow-[0_0_32px_rgba(6,182,212,0.1)]"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/15">
                <Code className="h-6 w-6 text-[var(--color-accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="mb-1 text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                  {t('apiReferenceHeading')}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {t('apiReferenceBody')}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--color-accent)]">
                  {t('apiReferenceLink')}
                  <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Link
              href="/docs/integrations"
              className="group relative flex items-start gap-4 rounded-2xl border border-[#a78bfa]/20 bg-[var(--bg-elevated)] p-6 backdrop-blur-xl transition-all duration-200 hover:border-[#a78bfa]/40 hover:shadow-[0_0_32px_rgba(167,139,250,0.1)]"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#a78bfa]/15">
                <Plug className="h-6 w-6 text-[#a78bfa]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="mb-1 text-base font-semibold text-[var(--text-primary)] group-hover:text-[#a78bfa] transition-colors">
                  {t('integrationsHeading')}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {t('integrationsBody')}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-[#a78bfa]">
                  {t('integrationsLink')}
                  <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>

        {/* ── Quick links grid ─────────────────────────────── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mb-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {QUICK_LINKS_ICONS.map((link, idx) => {
            const Icon = link.icon;
            const ql = t.raw('quickLinks') as Array<{ title: string; description: string }>;
            const { title, description } = ql[idx] ?? { title: '', description: '' };
            return (
              <motion.a
                key={title}
                variants={staggerItem}
                href={`${DOCS_URL}${link.href}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 backdrop-blur-xl transition-all duration-200 hover:border-[var(--color-accent)]/30 hover:shadow-[0_0_24px_rgba(6,182,212,0.06)]"
              >
                <div
                  className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200"
                  style={{ backgroundColor: `${link.color}15`, color: link.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
                  {title}
                  <ExternalLink className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                </h3>

                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {description}
                </p>

                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {t('readMore')}
                  <ArrowRight className="h-3 w-3" />
                </div>
              </motion.a>
            );
          })}
        </motion.div>

        {/* ── Popular topics ───────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-16">
          <h2 className="mb-6 text-lg font-semibold text-[var(--text-primary)]">{t('popularTopics')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(t.raw('topics') as Array<{ label: string }>).map((topic, idx) => {
              const topicHrefs = [
                '/getting-started#deploy',
                '/byok#providers',
                '/agent-configuration#openclaw',
                '/api-reference#containers',
                '/integrations#telegram',
                '/billing#hatch-payments',
              ];
              return (
                <a
                  key={idx}
                  href={`${DOCS_URL}${topicHrefs[idx] ?? ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--color-accent)]/20 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]/60 transition-colors duration-200 group-hover:bg-[var(--color-accent)]" />
                  {topic.label}
                  <ExternalLink className="ml-auto h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                </a>
              );
            })}
          </div>
        </motion.div>

        {/* ── Help CTA ─────────────────────────────────────── */}
        <motion.div
          variants={cardVariants}
          className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8 text-center backdrop-blur-xl"
        >
          <HelpCircle className="mx-auto mb-4 h-8 w-8 text-[var(--text-muted)]" />
          <h2 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
            {t('cantFind')}
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-[var(--text-secondary)]">
            {t('cantFindBody')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/support"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent)]/20 transition-all duration-200 hover:bg-[#0891b2] hover:shadow-[var(--color-accent)]/30"
            >
              <LifeBuoy className="h-4 w-4" />
              {t('contactSupport')}
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--color-accent)]/30 hover:text-[var(--text-primary)]"
            >
              <HelpCircle className="h-4 w-4" />
              {t('helpCenter')}
            </Link>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
