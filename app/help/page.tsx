'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL || 'https://docs.hatcher.fun';

const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

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
    href: 'https://discord.gg/hatcher',
    icon: MessageCircle,
    color: '#5865F2',
  },
  {
    label: 'X (Twitter)',
    description: 'Follow us for updates and announcements',
    href: 'https://x.com/hatcherfun',
    icon: ExternalLink,
    color: '#fafafa',
  },
  {
    label: 'Telegram',
    description: 'Chat with the team and community',
    href: 'https://t.me/hatcherfun',
    icon: Send,
    color: '#26A5E4',
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

export default function HelpPage() {
  return (
    <motion.div
      className="min-h-screen p-4 sm:p-6 lg:p-10"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-3xl mx-auto space-y-6">
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
          </div>
          <div className="space-y-2">
            {QUICK_FAQ.map((item, index) => (
              <FAQAccordion key={item.q} q={item.q} a={item.a} index={index} />
            ))}
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
      </div>
    </motion.div>
  );
}

// ── FAQ Accordion ──────────────────────────────────────────────

function FAQAccordion({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      className={cn(
        'card glass-noise overflow-hidden transition-all duration-200',
        open && 'border-[rgba(249,115,22,0.3)] shadow-[0_0_16px_rgba(249,115,22,0.06)]'
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left group"
      >
        <span className="text-sm font-medium text-[var(--text-primary)] pr-4 group-hover:text-[#f97316] transition-colors">
          {q}
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
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
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
