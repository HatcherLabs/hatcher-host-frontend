'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
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

// ── Quick link cards ────────────────────────────────────────────

const QUICK_LINKS = [
  {
    icon: Rocket,
    title: 'Getting Started',
    description: 'Set up your first AI agent in under 60 seconds. Quick start guide, prerequisites, and first deploy.',
    href: '/getting-started',
    color: '#f97316',
  },
  {
    icon: Bot,
    title: 'Agent Configuration',
    description: 'Configure personality, models, memory, cron jobs, webhooks, and multi-agent routing.',
    href: '/agent-configuration',
    color: '#22d3ee',
  },
  {
    icon: Globe,
    title: 'Platform Integrations',
    description: 'Connect to Telegram, Discord, WhatsApp, Slack, and 20+ messaging platforms.',
    href: '/integrations',
    color: '#a78bfa',
  },
  {
    icon: KeyRound,
    title: 'BYOK Setup',
    description: 'Bring your own API keys for OpenAI, Anthropic, Google, xAI, and more. Always free.',
    href: '/byok',
    color: '#4ade80',
  },
  {
    icon: CreditCard,
    title: 'Billing & Pricing',
    description: 'Understand token payments, feature unlocks, hosted credits, and subscription management.',
    href: '/billing',
    color: '#fbbf24',
  },
  {
    icon: Code,
    title: 'API Reference',
    description: 'REST API endpoints for agents, features, payments, and admin operations.',
    href: '/api-reference',
    color: '#f87171',
  },
];

// ── Page ────────────────────────────────────────────────────────

export default function DocsPage() {
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
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f97316]/20 bg-[#f97316]/5 px-4 py-1.5 text-sm font-medium text-[#f97316]">
            <BookOpen className="h-4 w-4" />
            Documentation
          </div>
          <h1 className="font-[var(--font-display)] text-4xl font-extrabold tracking-tight text-[#F0EEFC] sm:text-5xl">
            Documentation
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#A5A1C2]">
            Everything you need to build, deploy, and manage AI agents with Hatcher.
          </p>
        </motion.div>

        {/* ── Search bar (cosmetic) ────────────────────────── */}
        <motion.div variants={cardVariants} className="mx-auto mb-12 max-w-xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B6890]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documentation..."
              className="w-full rounded-xl border border-white/[0.06] bg-[#1A1730] py-3 pl-12 pr-4 text-[#F0EEFC] placeholder-[#6B6890] outline-none transition-all duration-200 focus:border-[#f97316]/40 focus:ring-2 focus:ring-[#f97316]/10"
            />
            {searchQuery && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#6B6890]">
                Search coming soon
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
              className="group relative flex items-start gap-4 rounded-2xl border border-[#f97316]/20 bg-[rgba(26,23,48,0.8)] p-6 backdrop-blur-xl transition-all duration-200 hover:border-[#f97316]/40 hover:shadow-[0_0_32px_rgba(249,115,22,0.1)]"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#f97316]/15">
                <Code className="h-6 w-6 text-[#f97316]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="mb-1 text-base font-semibold text-[#F0EEFC] group-hover:text-[#f97316] transition-colors">
                  API Reference
                </h3>
                <p className="text-sm leading-relaxed text-[#A5A1C2]">
                  Full endpoint documentation with examples in cURL, JavaScript, and Python. Auth, rate limits, and error codes.
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-[#f97316]">
                  Explore endpoints
                  <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Link
              href="/docs/integrations"
              className="group relative flex items-start gap-4 rounded-2xl border border-[#a78bfa]/20 bg-[rgba(26,23,48,0.8)] p-6 backdrop-blur-xl transition-all duration-200 hover:border-[#a78bfa]/40 hover:shadow-[0_0_32px_rgba(167,139,250,0.1)]"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#a78bfa]/15">
                <Plug className="h-6 w-6 text-[#a78bfa]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="mb-1 text-base font-semibold text-[#F0EEFC] group-hover:text-[#a78bfa] transition-colors">
                  Integration Guides
                </h3>
                <p className="text-sm leading-relaxed text-[#A5A1C2]">
                  Step-by-step setup for Telegram, Discord, WhatsApp, Slack, Twitter/X, and Signal. From credentials to first message.
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-[#a78bfa]">
                  Browse platforms
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
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <motion.a
                key={link.title}
                variants={staggerItem}
                href={`${DOCS_URL}${link.href}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative rounded-2xl border border-white/[0.06] bg-[rgba(26,23,48,0.8)] p-6 backdrop-blur-xl transition-all duration-200 hover:border-[#f97316]/30 hover:shadow-[0_0_24px_rgba(249,115,22,0.06)]"
              >
                <div
                  className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200"
                  style={{ backgroundColor: `${link.color}15`, color: link.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-[#F0EEFC]">
                  {link.title}
                  <ExternalLink className="h-3.5 w-3.5 text-[#6B6890] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                </h3>

                <p className="text-sm leading-relaxed text-[#A5A1C2]">
                  {link.description}
                </p>

                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-[#f97316] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Read more
                  <ArrowRight className="h-3 w-3" />
                </div>
              </motion.a>
            );
          })}
        </motion.div>

        {/* ── Popular topics ───────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-16">
          <h2 className="mb-6 text-lg font-semibold text-[#F0EEFC]">Popular topics</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'How to deploy your first agent', href: '/getting-started#deploy' },
              { label: 'Supported LLM providers', href: '/byok#providers' },
              { label: 'Agent framework configuration', href: '/agent-configuration#openclaw' },
              { label: 'Container lifecycle & status codes', href: '/api-reference#containers' },
              { label: 'Setting up Telegram integration', href: '/integrations#telegram' },
              { label: 'Understanding token payments', href: '/billing#hatch-payments' },
            ].map((topic) => (
              <a
                key={topic.label}
                href={`${DOCS_URL}${topic.href}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[rgba(26,23,48,0.5)] px-4 py-3 text-sm text-[#A5A1C2] transition-all duration-200 hover:border-[#f97316]/20 hover:bg-[rgba(26,23,48,0.8)] hover:text-[#F0EEFC]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#f97316]/60 transition-colors duration-200 group-hover:bg-[#f97316]" />
                {topic.label}
                <ExternalLink className="ml-auto h-3.5 w-3.5 text-[#6B6890] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              </a>
            ))}
          </div>
        </motion.div>

        {/* ── Help CTA ─────────────────────────────────────── */}
        <motion.div
          variants={cardVariants}
          className="rounded-2xl border border-white/[0.06] bg-[rgba(26,23,48,0.6)] p-8 text-center backdrop-blur-xl"
        >
          <HelpCircle className="mx-auto mb-4 h-8 w-8 text-[#6B6890]" />
          <h2 className="mb-2 text-lg font-semibold text-[#F0EEFC]">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-[#A5A1C2]">
            Our support team and community are here to help you get the most out of Hatcher.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/support"
              className="inline-flex items-center gap-2 rounded-xl bg-[#f97316] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#f97316]/20 transition-all duration-200 hover:bg-[#ea580c] hover:shadow-[#f97316]/30"
            >
              <LifeBuoy className="h-4 w-4" />
              Contact Support
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#1A1730] px-5 py-2.5 text-sm font-semibold text-[#A5A1C2] transition-all duration-200 hover:border-[#f97316]/30 hover:text-[#F0EEFC]"
            >
              <HelpCircle className="h-4 w-4" />
              Help Center
            </Link>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
