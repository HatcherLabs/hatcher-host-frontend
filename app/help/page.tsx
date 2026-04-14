'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
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

const QUICK_LINKS = [
  {
    label: 'Documentation',
    href: DOCS_URL,
    icon: BookOpen,
    emoji: '\uD83D\uDCD6',
    color: 'var(--color-accent)',
    external: true,
  },
  {
    label: 'Discord Community',
    href: 'https://discord.gg/7tY3HjKjMc',
    icon: MessageCircle,
    emoji: '\uD83D\uDCAC',
    color: '#7289da',
    external: true,
  },
  {
    label: 'Telegram Group',
    href: 'https://t.me/HatcherLabs',
    icon: MessageCircle,
    emoji: '\u2708\uFE0F',
    color: '#29a9eb',
    external: true,
  },
  {
    label: 'Submit Ticket',
    href: '/support',
    icon: Ticket,
    emoji: '\uD83C\uDFAB',
    color: '#f59e0b',
    external: false,
  },
  {
    label: 'Email Support',
    href: 'mailto:support@hatcher.host',
    icon: Mail,
    emoji: '\u2709\uFE0F',
    color: '#10b981',
    external: true,
  },
];

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
        a: 'Click "Create Agent" from the dashboard or the navigation bar. Choose a framework (OpenClaw, Hermes, ElizaOS, or Milady), pick a template or start from scratch, configure the agent personality and system prompt, then click Deploy. Your agent will be live in about 60 seconds. You can start chatting with it immediately from the dashboard.',
      },
      {
        q: 'What frameworks are available?',
        a: 'Hatcher supports four frameworks: OpenClaw (general-purpose conversational AI, 13,700+ skills), Hermes (task-oriented autonomous agent, 40+ tools), ElizaOS (multi-agent, 350+ plugins, blockchain-native), and Milady (privacy-first, 29 connectors). Each framework comes with multiple templates optimized for different use cases. Pick the one that best fits your needs when creating an agent.',
      },
      {
        q: 'How does the free tier work?',
        a: 'Every account starts with a free tier that includes 1 agent. Free agents get 10 messages per day using GPT-OSS 20B on Groq, with a 24-hour rolling reset. You get access to all integrations (Telegram, Discord, Twitter, WhatsApp, Slack). Free agents run on shared resources (0.5 CPU, 1GB RAM) and auto-sleep after 10 minutes of inactivity. Paid tiers (Pro, Business, Founding Member) use the more capable Llama 3.3 70B model and include web search via Brave. If you bring your own API key (BYOK), messages are always unlimited and free.',
      },
      {
        q: 'What is BYOK (Bring Your Own Key)?',
        a: 'BYOK stands for "Bring Your Own Key." Instead of using Hatcher\'s hosted LLM key (which has daily message limits), you can provide your own API key from any supported provider (OpenAI, Anthropic, Google, Groq, etc.). With BYOK, you pay the provider directly and get unlimited messages on Hatcher at no extra cost. Configure your key in the agent\'s Config tab under the model settings.',
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
        a: 'Open your agent\'s Config tab and look for the model settings section. If you\'re using Hatcher\'s hosted key, Free and Starter tiers use GPT-OSS 20B on Groq, while Pro, Business, and Founding Member tiers use Llama 3.3 70B on Groq. If you have BYOK configured, you can select from any model supported by your provider (e.g., GPT-4o, Claude 3.5, Gemini Pro). Change the model identifier, save, and restart.',
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
        a: 'Hatcher offers four tiers. Free: 1 agent, 10 messages/day (GPT-OSS 20B), shared resources, auto-sleep after 10 min. Starter ($4.99/mo): 1 agent, 50 messages/day (GPT-OSS 20B), better resources (1 CPU, 1.5GB RAM), auto-sleep after 2 hours. Pro ($14.99/mo): 3 agents, 200 messages/day per agent (Llama 3.3 70B), web search via Brave, dedicated resources (1.5 CPU, 2GB RAM), full log viewer. Business ($39.99/mo): 10 agents, 500 messages/day per agent (Llama 3.3 70B), web search via Brave, always-on, priority support. All tiers include all integrations and BYOK is always unlimited.',
      },
      {
        q: 'How do add-ons work?',
        a: 'Add-ons let you expand beyond your plan\'s included agent slots. You can stack multiple add-ons: +3 agents ($3.99/mo) or +10 agents ($9.99/mo). Add-ons are stackable and apply to your account. There\'s also a one-time File Manager add-on ($4.99/agent) that gives non-Pro users access to the file manager for a specific agent permanently.',
      },
      {
        q: 'How do I upgrade or downgrade?',
        a: 'Go to Settings or the Billing page in your dashboard. Select the plan you want and complete the payment. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period. If you downgrade and have more agents than your new plan allows, excess agents will be stopped but not deleted \u2014 you can choose which ones to keep active.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'Hatcher accepts payments in SOL (Solana) or $HATCHER. Prices are listed in USD and converted to the equivalent token amount using the live Jupiter Price API rate at the time of purchase. You\'ll sign a Solana transaction from your connected wallet, and the feature is unlocked once the transaction is confirmed on-chain. Stripe (credit card) support is also available.',
      },
      {
        q: 'Do I need crypto to use Hatcher?',
        a: 'No. The free tier requires no payment at all. For paid plans, Hatcher supports both crypto payments (SOL or $HATCHER via your Solana wallet) and traditional payments through Stripe (credit/debit card). You can use Hatcher without ever touching cryptocurrency. Connecting a wallet is optional and only needed for crypto-based payments.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    icon: AlertTriangle,
    items: [
      {
        q: 'My agent is not responding',
        a: 'First, check if your agent is running (status should show "running" on the dashboard). If it\'s stopped or sleeping, start it. If it\'s running but not responding: check that your integrations are properly configured with valid tokens, verify your daily message limit hasn\'t been reached (Free: 10/day, Starter: 50/day, Pro: 200/day, Business: 500/day), and check the Logs tab for errors. If using BYOK, confirm your API key is valid and has credits with the provider.',
      },
      {
        q: 'My agent keeps restarting',
        a: 'Automatic restarts usually indicate a crash loop. Hatcher restarts crashed containers up to 3 times within a 5-minute window. Common causes: invalid configuration JSON, missing required environment variables or API keys, out-of-memory errors (try reducing your agent\'s workload), or incompatible skill configurations. Check the Logs tab for the specific error message causing the crash.',
      },
      {
        q: 'How do I check logs?',
        a: 'Open your agent\'s dashboard and click the Logs tab. Free and Starter users see recent log entries. Pro and Business users have access to the full log viewer with search and filtering. Logs show agent startup, incoming messages, LLM calls, errors, and integration events. If your agent is crashing, the last few log lines before the crash will usually explain why.',
      },
      {
        q: 'My integration is not working',
        a: 'Verify that the bot token or API credentials are correct and haven\'t expired. For Telegram: make sure the bot token from @BotFather is valid and the bot hasn\'t been revoked. For Discord: check that the bot has been invited to your server with the correct permissions. For Twitter: ensure your API keys have read/write access. After updating credentials, restart your agent. Check the Logs tab for specific connection errors.',
      },
      {
        q: 'I am getting rate limited',
        a: 'Rate limiting means you\'ve hit your daily message quota. Free tier: 10 messages/day, Starter: 50/day, Pro: 200/day, Business: 500/day. The limit resets on a 24-hour rolling window. Solutions: upgrade your plan for a higher limit (Pro and above also get a more capable model and web search), switch to BYOK (your own API key) for unlimited messages, or wait for the limit to reset. The 429 error in logs confirms rate limiting. BYOK always bypasses Hatcher\'s message limits.',
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
    <motion.div
      className="min-h-screen p-4 sm:p-6 lg:p-10"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div variants={cardVariants} className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.06),transparent_60%)] pointer-events-none rounded-2xl" />
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center">
              <LifeBuoy size={20} className="text-[var(--color-accent)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Help Center
              </h1>
              <p className="text-sm mt-0.5 text-[var(--text-secondary)]">
                Find answers, browse guides, and get in touch with support
              </p>
            </div>
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={cardVariants}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_LINKS.map((link, index) => {
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
            placeholder="Search all questions... e.g. &quot;BYOK&quot;, &quot;rate limit&quot;, &quot;Telegram&quot;"
            className="w-full pl-11 pr-20 py-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-4 flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <span className="text-xs text-[var(--text-secondary)]">
                {filteredItems.length} {filteredItems.length === 1 ? 'result' : 'results'}
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
                        {section.items.length} {section.items.length === 1 ? 'match' : 'matches'}
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
                No matching questions found for &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Try different keywords or browse the{' '}
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-accent)] hover:underline"
                >
                  documentation
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
              Contact Us
            </h2>
          </div>
          <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed relative">
            <p>
              Can&apos;t find what you&apos;re looking for?{' '}
              <Link
                href="/support"
                className="font-medium text-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors underline decoration-[var(--color-accent)]/30 underline-offset-2"
              >
                Open a support ticket
              </Link>{' '}
              or reach out directly:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <a
                href="mailto:support@hatcher.host"
                className="flex items-center gap-2.5 p-3 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card)] transition-colors group"
              >
                <Mail size={14} className="text-[var(--color-accent)] flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors">support@hatcher.host</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Technical help</p>
                </div>
              </a>
              <a
                href="mailto:contact@hatcher.host"
                className="flex items-center gap-2.5 p-3 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card)] transition-colors group"
              >
                <Mail size={14} className="text-[#10b981] flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors">contact@hatcher.host</p>
                  <p className="text-[10px] text-[var(--text-muted)]">General inquiries</p>
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
                  <p className="text-[10px] text-[var(--text-muted)]">Community support</p>
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
                  <p className="text-[10px] text-[var(--text-muted)]">Community chat</p>
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
                Still need help?
              </p>
              <p className="text-sm mt-0.5 text-[var(--text-secondary)]">
                Submit a support ticket and our team will get back to you within 24 hours.
              </p>
            </div>
            <ArrowRight size={20} className="flex-shrink-0 text-[var(--text-muted)] group-hover:text-[var(--color-accent)] transition-all duration-200 group-hover:translate-x-1 relative" />
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
