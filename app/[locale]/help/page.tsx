'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/i18n/routing';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import {
  BookOpen,
  MessageCircle,
  HelpCircle,
  Mail,
  ChevronDown,
  LifeBuoy,
  ArrowRight,
  Search,
  Rocket,
  Settings,
  CreditCard,
  AlertTriangle,
  Ticket,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

// ── Quick Links ────────────────────────────────────────────────


// ── FAQ Sections ───────────────────────────────────────────────

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSection {
  title: string;
  icon: typeof Rocket;
  items: FAQItem[];
}

const FAQ_SECTIONS: FAQSection[] = [
  {
    title: 'Getting Started',
    icon: Rocket,
    items: [
      {
        q: 'How do I create my first agent?',
        a: 'Click "Create Agent" from the dashboard or the navigation bar. Chat-to-Hatch will ask what you want, draft the OpenClaw or Hermes configuration, and let you adjust the agent before deployment. Your agent will be live in about 60 seconds.',
      },
      {
        q: 'What frameworks are available?',
        a: 'Hatcher currently focuses on OpenClaw and Hermes. OpenClaw is best for skill-heavy automation, integrations, cron, files, and workspace tasks. Hermes is best for adaptive long-running agents with memory, research workflows, and live configuration.',
      },
      {
        q: 'How does the free tier work?',
        a: 'Every account starts with a free tier that includes 1 agent, 500 AI Credits/month, File Manager, Full Logs, all integrations, and 2GB workspace. Hosted model and web-search usage spends AI Credits. If you bring your own API key (BYOK), provider usage is paid directly to your provider and does not consume Hatcher AI Credits.',
      },
      {
        q: 'What is BYOK (Bring Your Own Key)?',
        a: 'BYOK stands for "Bring Your Own Key." Instead of using Hatcher-funded hosted model usage, you can provide your own API key from any supported provider (OpenAI, Anthropic, Google, OpenRouter, etc.). With BYOK, you pay the provider directly and Hatcher does not spend your AI Credits.',
      },
      {
        q: 'How do I connect Telegram or Discord?',
        a: 'Navigate to your agent\'s dashboard and open the Integrations tab. Select the platform you want to connect (Telegram, Discord, WhatsApp, Slack, or Twitter). Enter the required credentials (e.g., Telegram bot token from @BotFather, Discord bot token from the Discord Developer Portal). Save and restart the agent. The connection will be established automatically. All integrations are available on every tier, including free.',
      },
    ],
  },
  {
    title: 'Agent Management',
    icon: Settings,
    items: [
      {
        q: 'How do I configure my agent?',
        a: 'From the dashboard, click on your agent to open its detail view. Use the Config tab to edit the JSON configuration directly, or use the individual tabs (Personality, Integrations, Skills) for a guided experience. Changes are saved when you click Save, and take effect after restarting the agent.',
      },
      {
        q: 'How do I add integrations?',
        a: 'Open your agent\'s Integrations tab. You\'ll see all available platforms listed. Click on the one you want to add, provide the required API tokens or credentials, and save. The integration will activate on the next agent restart. You can add multiple integrations to a single agent \u2014 for example, the same agent can respond on Telegram and Discord simultaneously.',
      },
      {
        q: 'How do I use skills and plugins?',
        a: 'Skills extend your agent\'s capabilities beyond basic conversation. Go to the Skills tab in your agent\'s dashboard to browse available skills (web search, image generation, code execution, etc.). Enable the ones you want, configure any required API keys, and save. Skills are framework-dependent \u2014 each framework supports a different set of plugins.',
      },
      {
        q: 'What is the system prompt?',
        a: 'The system prompt defines your agent\'s personality, behavior, and instructions. It tells the AI who it is, how to respond, what topics to focus on, and any rules to follow. You can edit it in the Personality tab or directly in the Config tab. A well-crafted system prompt is the most important factor in your agent\'s quality. Be specific and detailed about the behavior you want.',
      },
      {
        q: 'How do I change the AI model?',
        a: 'Open your agent\'s Config tab and look for the model settings section. For Hatcher-hosted usage, choose the provider family and model you want from the selector; most hosted usage uses UsePod first with OpenRouter fallback and spends AI Credits. Direct partner models such as IDLE and AceData show their own route and pricing. If you have BYOK configured, select any model supported by your own provider key. Save the configuration and restart the agent so the runtime loads the new model.',
      },
      {
        q: 'How do I start, stop, or restart my agent?',
        a: 'Use the controls at the top of your agent\'s dashboard page. The Start button deploys the agent container and makes it active. Stop shuts it down. Restart performs a stop followed by a start, which is useful after configuration changes. You can also manage agent lifecycle from the main dashboard grid using the action menu on each agent card.',
      },
    ],
  },
  {
    title: 'Billing & Plans',
    icon: CreditCard,
    items: [
      {
        q: 'What plans are available?',
        a: 'Hatcher offers four tiers plus a lifetime option. Free: 1 agent, 500 AI Credits/month, 1 CPU/1GB RAM, 2GB workspace, auto-sleep after 12 hours. Starter ($6.99/mo): 1 agent, 3,000 AI Credits/month, 1 CPU/1.5GB RAM, 10GB workspace, always active. Pro ($19.99/mo): 3 agents, 15,000 AI Credits/month, 1.5 CPU/2GB RAM, 25GB workspace, always active. Business ($49.99/mo): 5 agents, 40,000 AI Credits/month, 2 CPU/3GB RAM, 50GB workspace, always active, team collaboration, priority support. Founding Member ($99 one-time, 20 spots): 10 agents, 25,000 AI Credits/month, 2 CPU/4GB RAM, 40GB workspace, lifetime access. Hosted models and web search use AI Credits. BYOK is paid directly to your provider.',
      },
      {
        q: 'How do extras work?',
        a: 'Extras expand capacity. Account-level extras cover extra agent slots and one-time AI Credit top-ups for hosted models, web search, and research. Plugins and skills are included on every tier. File Manager, Full Logs, and always-active paid tiers are included by plan instead of sold separately.',
      },
      {
        q: 'How do I upgrade or downgrade?',
        a: 'Go to Settings or the Billing page in your dashboard. Select the plan you want and complete the payment. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period. If you downgrade and have more agents than your new plan allows, excess agents will be stopped but not deleted \u2014 you can choose which ones to keep active.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'Hatcher accepts payments by card, SOL, USDC on Solana, $HATCHER, or $KAUSA. Crypto prices are listed in USD and converted to the equivalent token amount using the live Jupiter Price API rate at the time of purchase. You\'ll sign a Solana transaction from your connected wallet for crypto payments, and the feature is unlocked once the transaction is confirmed on-chain.',
      },
      {
        q: 'Do I need crypto to use Hatcher?',
        a: 'No. The free tier requires no payment at all. For paid plans, Hatcher supports crypto payments (SOL, USDC on Solana, $HATCHER, or $KAUSA via your Solana wallet) and traditional payments through Stripe (credit/debit card). You can use Hatcher without ever touching cryptocurrency. Connecting a wallet is optional and only needed for crypto-based payments.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    icon: AlertTriangle,
    items: [
      {
        q: 'My agent is not responding',
        a: 'First, check if your agent is running (status should show "running" on the dashboard). If it\'s stopped or sleeping, start it. If it\'s running but not responding: check that your integrations are properly configured with valid tokens, verify your AI Credit balance for hosted models/web search, and check the Logs tab for errors. If using BYOK, confirm your API key is valid and has credits with the provider.',
      },
      {
        q: 'My agent keeps restarting',
        a: 'Automatic restarts usually indicate a crash loop. Hatcher restarts crashed containers up to 3 times within a 5-minute window. Common causes: invalid configuration JSON, missing required environment variables or API keys, out-of-memory errors (try reducing your agent\'s workload), or incompatible skill configurations. Check the Logs tab for the specific error message causing the crash.',
      },
      {
        q: 'How do I check logs?',
        a: 'Open your agent\'s dashboard and click the Logs tab. The full log viewer with search, filtering, and export is included on every tier. Logs show agent startup, incoming messages, LLM calls, errors, and integration events. If your agent is crashing, the last few log lines before the crash will usually explain why.',
      },
      {
        q: 'My integration is not working',
        a: 'Verify that the bot token or API credentials are correct and haven\'t expired. For Telegram: make sure the bot token from @BotFather is valid and the bot hasn\'t been revoked. For Discord: check that the bot has been invited to your server with the correct permissions. For Twitter: ensure your API keys have read/write access. After updating credentials, restart your agent. Check the Logs tab for specific connection errors.',
      },
      {
        q: 'I am getting rate limited',
        a: 'Hosted model and web-search usage is metered with AI Credits. If a request is blocked, check your AI Credit balance, top up credits, upgrade for a larger monthly grant, or switch the agent to BYOK. BYOK traffic is paid directly to your provider and does not consume Hatcher AI Credits.',
      },
    ],
  },
];

// Flatten all FAQ items for search
const ALL_FAQ_ITEMS = FAQ_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({
    ...item,
    sectionTitle: section.title,
  }))
);

// ── Page Component ──────────────────────────────────────────────

export default function HelpPage() {
  const t = useTranslations('help');
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isSearching = searchQuery.trim().length > 0;

  const filteredItems = useMemo(() => {
    if (!isSearching) return [];
    const query = searchQuery.toLowerCase();
    return ALL_FAQ_ITEMS.filter(
      (item) =>
        item.q.toLowerCase().includes(query) ||
        item.a.toLowerCase().includes(query)
    );
  }, [searchQuery, isSearching]);

  // Group filtered items back by section for display
  const filteredSections = useMemo(() => {
    if (!isSearching) return FAQ_SECTIONS;
    const grouped = new Map<string, FAQItem[]>();
    for (const item of filteredItems) {
      const existing = grouped.get(item.sectionTitle) || [];
      existing.push({ q: item.q, a: item.a });
      grouped.set(item.sectionTitle, existing);
    }
    return FAQ_SECTIONS.filter((s) => grouped.has(s.title)).map((s) => ({
      ...s,
      items: grouped.get(s.title)!,
    }));
  }, [filteredItems, isSearching]);

  return (
    <MarketingShell>
      <motion.div
        className="p-4 sm:p-6 lg:p-10"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div variants={cardVariants} className="relative">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('eyebrow')}</p>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              {t('heading')}
            </h1>
            <p className="text-sm mt-2 text-[var(--text-secondary)]">
              {t('subheading')}
            </p>
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={cardVariants}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t('quickLinks.documentation'), href: DOCS_URL, icon: BookOpen, color: 'var(--color-accent)', external: true },
              { label: t('quickLinks.discord'), href: 'https://discord.gg/7tY3HjKjMc', icon: MessageCircle, color: '#7289da', external: true },
              { label: t('quickLinks.telegram'), href: 'https://t.me/HatcherLabs', icon: MessageCircle, color: '#29a9eb', external: true },
              { label: t('quickLinks.submitTicket'), href: '/support', icon: Ticket, color: '#f59e0b', external: false },
              { label: t('quickLinks.emailSupport'), href: 'mailto:support@hatcher.host', icon: Mail, color: '#486a79', external: true },
            ].map((link, index) => {
              const inner = (
                <motion.div
                  className="group card glass-noise p-4 flex flex-col items-center gap-2.5 text-center transition-all duration-200 hover:border-[rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.06)] cursor-pointer"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -3 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110"
                    style={{ background: link.color + '18' }}
                  >
                    <link.icon size={20} style={{ color: link.color }} />
                  </div>
                  <span className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors leading-tight">
                    {link.label}
                  </span>
                </motion.div>
              );

              if (link.external) {
                return (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
                    {inner}
                  </a>
                );
              }
              return (
                <Link key={link.label} href={link.href}>
                  {inner}
                </Link>
              );
            })}
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
            placeholder={t('searchPlaceholder')}
            className="w-full pl-11 pr-20 py-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-4 flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <span className="text-xs text-[var(--text-secondary)]">
                {filteredItems.length === 1 ? t('resultCount', { count: filteredItems.length }) : t('resultCountPlural', { count: filteredItems.length })}
              </span>
              <X size={14} />
            </button>
          )}
        </motion.div>

        {/* FAQ Sections */}
        <AnimatePresence mode="popLayout">
          {filteredSections.length > 0 ? (
            filteredSections.map((section, sectionIndex) => {
              const SectionIcon = section.icon;
              return (
                <motion.div
                  key={section.title}
                  variants={cardVariants}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                  transition={{ delay: sectionIndex * 0.05 }}
                >
                  <div className="flex items-center gap-2.5 mb-4 px-1">
                    <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center">
                      <SectionIcon size={14} className="text-[var(--color-accent)]" />
                    </div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      {section.title}
                    </h2>
                    {isSearching && (
                      <span className="text-xs text-[var(--text-muted)] ml-auto">
                        {section.items.length === 1 ? t('matchCount', { count: section.items.length }) : t('matchCountPlural', { count: section.items.length })}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {section.items.map((item, itemIndex) => {
                      const itemKey = `${section.title}::${item.q}`;
                      const isOpen = openItems.has(itemKey);
                      return (
                        <FAQAccordion
                          key={itemKey}
                          q={item.q}
                          a={item.a}
                          index={itemIndex}
                          searchQuery={searchQuery}
                          isOpen={isOpen}
                          onToggle={() => toggleItem(itemKey)}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="card glass-noise p-10 text-center"
            >
              <HelpCircle size={36} className="mx-auto text-[var(--text-muted)] mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">
                {t('noMatchHeading')}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                {t('noMatchBody')}{' '}
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-accent)] hover:underline"
                >
                  {t('documentationLink')}
                </a>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contact Section */}
        <motion.div className="card glass-noise p-6 relative overflow-hidden" variants={cardVariants}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-[radial-gradient(circle,rgba(6,182,212,0.06),transparent_70%)] pointer-events-none" />
          <div className="flex items-center gap-2.5 mb-4 relative">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/15 flex items-center justify-center">
              <Mail size={16} className="text-[var(--color-accent)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t('contactHeading')}
            </h2>
          </div>
          <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed relative">
            <p>
              {t('contactBody')}{' '}
              <Link
                href="/support"
                className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors underline decoration-[var(--color-accent)]/30 underline-offset-2"
              >
                {t('openTicket')}
              </Link>{' '}
              {t('contactOr')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <a
                href="mailto:support@hatcher.host"
                className="flex items-center gap-2.5 p-3 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card)] transition-colors group"
              >
                <Mail size={14} className="text-[var(--color-accent)] flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors">support@hatcher.host</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{t('technicalHelp')}</p>
                </div>
              </a>
              <a
                href="mailto:contact@hatcher.host"
                className="flex items-center gap-2.5 p-3 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card)] transition-colors group"
              >
                <Mail size={14} className="text-[#486a79] flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors">contact@hatcher.host</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{t('generalInquiries')}</p>
                </div>
              </a>
              <a
                href="https://discord.gg/7tY3HjKjMc"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card)] transition-colors group"
              >
                <MessageCircle size={14} className="text-[#7289da] flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors">Discord</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{t('communitySupport')}</p>
                </div>
              </a>
              <a
                href="https://t.me/HatcherLabs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card)] transition-colors group"
              >
                <MessageCircle size={14} className="text-[#29a9eb] flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors">Telegram</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{t('communityChat')}</p>
                </div>
              </a>
            </div>
          </div>
        </motion.div>

        {/* Still need help CTA */}
        <motion.div variants={cardVariants}>
          <Link
            href="/support"
            className="group card glass-noise p-6 flex items-center gap-5 relative overflow-hidden transition-all duration-200 hover:border-[rgba(6,182,212,0.3)] hover:shadow-[0_0_24px_rgba(6,182,212,0.08)] block"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.04),transparent_60%)] pointer-events-none" />
            <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:bg-[var(--color-accent)]/20 group-hover:scale-105 relative">
              <LifeBuoy size={24} className="text-[var(--color-accent)]" />
            </div>
            <div className="flex-1 min-w-0 relative">
              <p className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                {t('stillNeedHelp')}
              </p>
              <p className="text-sm mt-0.5 text-[var(--text-secondary)]">
                {t('ticketResponse')}
              </p>
            </div>
            <ArrowRight size={20} className="flex-shrink-0 text-[var(--text-muted)] group-hover:text-[var(--color-accent)] transition-all duration-200 group-hover:translate-x-1 relative" />
          </Link>
        </motion.div>
      </div>
      </motion.div>
    </MarketingShell>
  );
}

// ── FAQ Accordion ──────────────────────────────────────────────

function FAQAccordion({
  q,
  a,
  index,
  searchQuery,
  isOpen,
  onToggle,
}: {
  q: string;
  a: string;
  index: number;
  searchQuery: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  // Highlight matching text
  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded-sm px-0.5">
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
        isOpen && 'border-[rgba(6,182,212,0.3)] shadow-[0_0_16px_rgba(6,182,212,0.06)]'
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.03 }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left group"
      >
        <span className="text-sm font-medium text-[var(--text-primary)] pr-4 group-hover:text-[var(--color-accent)] transition-colors">
          {highlightText(q)}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
            isOpen ? 'bg-[var(--color-accent)]/15' : 'bg-[var(--bg-card)]'
          )}
        >
          <ChevronDown className={cn('w-4 h-4 transition-colors', isOpen ? 'text-[var(--color-accent)]' : 'text-[var(--text-muted)]')} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[rgba(6,182,212,0.2)] to-transparent mb-3" />
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {highlightText(a)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
