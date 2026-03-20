'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  BookOpen,
  MessageCircle,
  HelpCircle,
  ExternalLink,
  Mail,
  Send,
  ChevronDown,
  Sparkles,
  LifeBuoy,
  ArrowRight,
  Search,
  Rocket,
  Plug,
  Key,
  Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DOCS_URL, SOCIAL_LINKS } from '@/lib/config';

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

// ── Data ────────────────────────────────────────────────────────

const LINKS = [
  {
    label: 'Documentation',
    description: 'Guides, API reference, and tutorials',
    href: DOCS_URL,
    icon: BookOpen,
    color: '#f97316',
  },
  {
    label: 'FAQ',
    description: 'Frequently asked questions',
    href: `${DOCS_URL}/faq`,
    icon: HelpCircle,
    color: '#f97316',
  },
  {
    label: 'Discord Community',
    description: 'Join our community for support and discussion',
    href: SOCIAL_LINKS.discord,
    icon: MessageCircle,
    color: '#5865F2',
  },
  {
    label: 'X (Twitter)',
    description: 'Follow us for updates and announcements',
    href: SOCIAL_LINKS.twitter,
    icon: ExternalLink,
    color: '#fafafa',
  },
  {
    label: 'Telegram',
    description: 'Chat with the team and community',
    href: SOCIAL_LINKS.telegram,
    icon: Send,
    color: '#26A5E4',
  },
];

const GETTING_STARTED = [
  {
    title: 'Create Agent',
    description: 'Pick a template, set a personality, and deploy in 60 seconds.',
    icon: Rocket,
    href: '/create',
  },
  {
    title: 'Connect Platforms',
    description: 'Link Telegram, Discord, WhatsApp, and 20+ messaging platforms.',
    icon: Plug,
    href: '/docs#integrations',
  },
  {
    title: 'Add BYOK Key',
    description: 'Bring your own API key from any LLM provider — always free.',
    icon: Key,
    href: '/settings',
  },
  {
    title: 'Explore Agents',
    description: 'Browse community agents for inspiration and templates.',
    icon: Compass,
    href: '/explore',
  },
];

const QUICK_FAQ = [
  {
    q: 'How do I create my first agent?',
    a: 'Click "Create Agent" from the dashboard or navigation. Choose a template or start from scratch, configure your agent personality, and click deploy. Your agent will be live in about 60 seconds.',
  },
  {
    q: 'What is BYOK and is it really free?',
    a: 'BYOK stands for "Bring Your Own Key." You can use your own API key from any supported LLM provider (OpenAI, Anthropic, Google, etc.) at zero cost from Hatcher. You only pay the provider directly.',
  },
  {
    q: 'How do I connect my agent to Telegram or Discord?',
    a: 'Navigate to your agent\'s Integrations tab, unlock the platform you want (e.g., Telegram for $4), then enter your bot token. The agent will automatically connect on the next deploy.',
  },
  {
    q: 'What happens when my agent crashes?',
    a: 'Hatcher automatically restarts crashed containers up to 3 times within a 5-minute window. If the issue persists, the agent will be marked as errored and you will be notified. Check the logs for error details.',
  },
  {
    q: 'How do payments work with $HATCH?',
    a: 'Feature prices are listed in USD. When you purchase, the equivalent $HATCH amount is calculated using the live Jupiter Price API rate. You sign a Solana transaction, and once confirmed, the feature is unlocked.',
  },
  {
    q: 'Can I export my agent configuration?',
    a: 'Yes. Go to your agent\'s Config tab to view and copy the full JSON configuration. This is portable and can be used with any OpenClaw deployment.',
  },
];

// ── Page Component ──────────────────────────────────────────────

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFAQ = useMemo(() => {
    if (!searchQuery.trim()) return QUICK_FAQ;
    const query = searchQuery.toLowerCase();
    return QUICK_FAQ.filter(
      (item) =>
        item.q.toLowerCase().includes(query) ||
        item.a.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <motion.div
      className="min-h-screen p-4 sm:p-6 lg:p-10"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <motion.div variants={cardVariants} className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.06),transparent_60%)] pointer-events-none rounded-2xl" />
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#f97316]/15 flex items-center justify-center">
              <LifeBuoy size={20} className="text-[#f97316]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Help & Support
              </h1>
              <p className="text-sm mt-0.5 text-[var(--text-secondary)]">
                Find answers and get in touch with the team
              </p>
            </div>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div variants={cardVariants} className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search size={18} className="text-[var(--text-muted)]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search frequently asked questions..."
            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#252240] border border-[rgba(46,43,74,0.6)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <span className="text-xs">Clear</span>
            </button>
          )}
        </motion.div>

        {/* Getting Started */}
        <motion.div variants={cardVariants}>
          <div className="flex items-center gap-2.5 mb-4 px-1">
            <Rocket size={16} className="text-[#f97316]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Getting Started
            </h2>
          </div>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {GETTING_STARTED.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.title} variants={staggerItem}>
                  <Link
                    href={item.href}
                    className="group card glass-noise p-5 flex flex-col gap-3 transition-all duration-200 hover:border-[rgba(249,115,22,0.3)] hover:shadow-[0_0_20px_rgba(249,115,22,0.06)] block"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center transition-all duration-200 group-hover:bg-[#f97316]/20 group-hover:scale-105">
                      <Icon size={20} className="text-[#f97316]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#f97316] transition-colors">
                        {item.title}
                      </p>
                      <p className="text-xs mt-1 text-[var(--text-muted)] leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-auto">
                      <span className="text-xs text-[#f97316]/70 group-hover:text-[#f97316] transition-colors font-medium">
                        Learn more
                      </span>
                      <ArrowRight size={12} className="text-[#f97316]/70 group-hover:text-[#f97316] transition-all duration-200 group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>

        {/* Quick Links */}
        <motion.div className="card glass-noise p-2" variants={cardVariants}>
          <div className="space-y-0.5">
            {LINKS.map((link, index) => {
              const Icon = link.icon;
              return (
                <motion.a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200 hover:bg-white/[0.03] group"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-105"
                    style={{ background: link.color + '18' }}
                  >
                    <Icon size={20} style={{ color: link.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[#f97316] transition-colors">
                      {link.label}
                    </p>
                    <p className="text-xs mt-0.5 text-[var(--text-muted)]">
                      {link.description}
                    </p>
                  </div>
                  <ArrowRight size={14} className="flex-shrink-0 text-[var(--text-muted)] group-hover:text-[#f97316] transition-all duration-200 group-hover:translate-x-1" />
                </motion.a>
              );
            })}
          </div>
        </motion.div>

        {/* Quick FAQ */}
        <motion.div variants={cardVariants}>
          <div className="flex items-center gap-2.5 mb-4 px-1">
            <Sparkles size={16} className="text-[#f97316]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Quick Answers
            </h2>
            {searchQuery && (
              <span className="text-xs text-[var(--text-muted)] ml-auto">
                {filteredFAQ.length} {filteredFAQ.length === 1 ? 'result' : 'results'}
              </span>
            )}
          </div>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredFAQ.length > 0 ? (
                filteredFAQ.map((item, index) => (
                  <FAQAccordion
                    key={item.q}
                    q={item.q}
                    a={item.a}
                    index={index}
                    searchQuery={searchQuery}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="card glass-noise p-8 text-center"
                >
                  <HelpCircle size={32} className="mx-auto text-[var(--text-muted)] mb-3" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    No matching questions found for &ldquo;{searchQuery}&rdquo;
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Try different keywords or check the documentation
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Contact */}
        <motion.div className="card glass-noise p-6 relative overflow-hidden" variants={cardVariants}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-[radial-gradient(circle,rgba(249,115,22,0.06),transparent_70%)] pointer-events-none" />
          <div className="flex items-center gap-2.5 mb-4 relative">
            <div className="w-8 h-8 rounded-lg bg-[#f97316]/15 flex items-center justify-center">
              <Mail size={16} className="text-[#f97316]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Contact Us
            </h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed relative">
            For direct support, reach out to us at{' '}
            <a
              href="mailto:support@hatcher.fun"
              className="font-medium text-[#f97316] hover:text-[#f97316] transition-colors underline decoration-[#f97316]/30 underline-offset-2"
            >
              support@hatcher.fun
            </a>
            . We typically respond within 24 hours.
          </p>
        </motion.div>

        {/* Still need help? */}
        <motion.div variants={cardVariants}>
          <Link
            href="/support"
            className="group card glass-noise p-6 flex items-center gap-5 relative overflow-hidden transition-all duration-200 hover:border-[rgba(249,115,22,0.3)] hover:shadow-[0_0_24px_rgba(249,115,22,0.08)] block"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(249,115,22,0.04),transparent_60%)] pointer-events-none" />
            <div className="w-12 h-12 rounded-xl bg-[#f97316]/10 flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:bg-[#f97316]/20 group-hover:scale-105 relative">
              <LifeBuoy size={24} className="text-[#f97316]" />
            </div>
            <div className="flex-1 min-w-0 relative">
              <p className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[#f97316] transition-colors">
                Still need help?
              </p>
              <p className="text-sm mt-0.5 text-[var(--text-secondary)]">
                Visit our support page to submit a request or start a conversation.
              </p>
            </div>
            <ArrowRight size={20} className="flex-shrink-0 text-[var(--text-muted)] group-hover:text-[#f97316] transition-all duration-200 group-hover:translate-x-1 relative" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── FAQ Accordion ──────────────────────────────────────────────

function FAQAccordion({
  q,
  a,
  index,
  searchQuery,
}: {
  q: string;
  a: string;
  index: number;
  searchQuery: string;
}) {
  const [open, setOpen] = useState(false);

  // Highlight matching text in the question
  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-[#f97316]/20 text-[#f97316] rounded-sm px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <motion.div
      layout
      className={cn(
        'card glass-noise overflow-hidden transition-all duration-200',
        open && 'border-[rgba(249,115,22,0.3)] shadow-[0_0_16px_rgba(249,115,22,0.06)]'
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.04 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left group"
      >
        <span className="text-sm font-medium text-[var(--text-primary)] pr-4 group-hover:text-[#f97316] transition-colors">
          {highlightText(q)}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
            open ? 'bg-[#f97316]/15' : 'bg-white/[0.03]'
          )}
        >
          <ChevronDown className={cn('w-4 h-4 transition-colors', open ? 'text-[#f97316]' : 'text-[var(--text-muted)]')} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[rgba(249,115,22,0.2)] to-transparent mb-3" />
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
