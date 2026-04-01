'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  Hash,
  Phone,
  Slack,
  Twitter,
  Signal,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Clock,
  DollarSign,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

// ── Difficulty badge ────────────────────────────────────────────

function DifficultyBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    Easy: 'bg-green-500/10 text-green-400 border-green-500/20',
    Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Advanced: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border', styles[level])}>
      {level}
    </span>
  );
}

// ── Copyable code block ─────────────────────────────────────────

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="relative group rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] px-4 py-3 pr-12">
      <code className="text-sm font-[family-name:var(--font-mono)] text-[var(--text-secondary)] break-all">
        {text}
      </code>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#06b6d4] hover:bg-[#06b6d4]/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
        aria-label="Copy"
      >
        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

// ── FAQ accordion ───────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        'card glass-noise overflow-hidden transition-all duration-200',
        open && 'border-[rgba(6,182,212,0.3)] shadow-[0_0_16px_rgba(6,182,212,0.06)]'
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left group"
      >
        <span className="text-sm font-medium text-[var(--text-primary)] pr-4 group-hover:text-[#06b6d4] transition-colors">
          {q}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
            open ? 'bg-[#06b6d4]/15' : 'bg-[var(--bg-card)]'
          )}
        >
          <ChevronDown className={cn('w-4 h-4 transition-colors', open ? 'text-[#06b6d4]' : 'text-[var(--text-muted)]')} />
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
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[rgba(6,182,212,0.2)] to-transparent mb-3" />
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Platform guide data ─────────────────────────────────────────

interface PlatformGuide {
  name: string;
  icon: LucideIcon;
  color: string;
  difficulty: string;
  cost: string;
  setupTime: string;
  warnings?: string[];
  prerequisites: string[];
  steps: { title: string; content: string; code?: string }[];
  hatcherConfig: { field: string; value: string; description: string }[];
  testSteps: string[];
  faq: { q: string; a: string }[];
}

const GUIDES: Record<string, PlatformGuide> = {
  telegram: {
    name: 'Telegram',
    icon: MessageCircle,
    color: '#26A5E4',
    difficulty: 'Easy',
    cost: 'Free',
    setupTime: '2 min',
    prerequisites: [
      'A Telegram account',
      'Telegram app (desktop or mobile)',
    ],
    steps: [
      {
        title: 'Open BotFather',
        content: 'Search for @BotFather in the Telegram app and start a conversation. BotFather is the official Telegram bot for creating and managing bots.',
      },
      {
        title: 'Create a new bot',
        content: 'Send the /newbot command to BotFather. It will ask you for a display name (e.g., "My Hatcher Agent") and a username. The username must end with "bot" (e.g., "my_hatcher_agent_bot").',
      },
      {
        title: 'Copy the bot token',
        content: 'BotFather will respond with your HTTP API token. It looks like this:',
        code: '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ',
      },
      {
        title: 'Configure in Hatcher',
        content: 'Go to your agent\'s Integrations tab in the Hatcher dashboard. Select Telegram, paste your bot token, and save.',
      },
      {
        title: 'Deploy or restart',
        content: 'Deploy your agent (or restart it if already running). The Telegram integration activates automatically.',
      },
    ],
    hatcherConfig: [
      { field: 'Bot Token', value: '123456789:ABCdef...', description: 'The HTTP API token from BotFather' },
    ],
    testSteps: [
      'Open Telegram and find your bot by its username',
      'Send a message like "Hello"',
      'Your agent should respond within a few seconds',
      'Check the Logs tab in Hatcher to verify message receipt',
    ],
    faq: [
      { q: 'Can I use an existing bot?', a: 'Yes, you can use any Telegram bot token. If the bot is already running elsewhere, stop it first to avoid conflicts.' },
      { q: 'How do I add my bot to a group?', a: 'Add the bot to the group as a member. By default, bots only see messages that mention them or are replies. Enable "Group Privacy" mode in BotFather to see all messages.' },
      { q: 'Is there a message limit?', a: 'Telegram allows bots to send up to 30 messages per second to different chats, and 20 messages per minute to the same group. This is more than enough for most agents.' },
      { q: 'My bot is not responding. What should I do?', a: 'Check the Logs tab in your agent dashboard. Common issues: wrong token, agent not running, or the agent crashed. Try restarting.' },
    ],
  },
  discord: {
    name: 'Discord',
    icon: Hash,
    color: '#5865F2',
    difficulty: 'Easy',
    cost: 'Free',
    setupTime: '5 min',
    prerequisites: [
      'A Discord account',
      'Admin access to a Discord server (or permission to add bots)',
    ],
    steps: [
      {
        title: 'Create a Discord Application',
        content: 'Go to the Discord Developer Portal and click "New Application." Give it a name and click "Create."',
        code: 'https://discord.com/developers/applications',
      },
      {
        title: 'Create the Bot',
        content: 'In your application settings, go to the "Bot" section. Click "Reset Token" to generate a new bot token. Copy it immediately -- it won\'t be shown again.',
      },
      {
        title: 'Enable required intents',
        content: 'Still in the Bot section, scroll down to "Privileged Gateway Intents." Enable: Message Content Intent and Server Members Intent. These are required for your agent to read messages.',
      },
      {
        title: 'Generate invite URL',
        content: 'Go to OAuth2 > URL Generator. Select the "bot" scope. Under "Bot Permissions," select "Send Messages," "Read Message History," and "View Channels." Copy the generated URL.',
      },
      {
        title: 'Invite the bot to your server',
        content: 'Open the invite URL in your browser. Select the server you want to add the bot to and authorize it.',
      },
      {
        title: 'Configure in Hatcher',
        content: 'Go to your agent\'s Integrations tab. Select Discord, paste your bot token, and save.',
      },
    ],
    hatcherConfig: [
      { field: 'Bot Token', value: 'MTExNjE3...', description: 'The bot token from the Developer Portal' },
    ],
    testSteps: [
      'Open your Discord server',
      'Check that the bot appears in the member list (may show as offline until the agent starts)',
      'Send a message mentioning the bot: @YourBot hello',
      'The agent should respond in the channel',
      'Check the Logs tab in Hatcher to verify',
    ],
    faq: [
      { q: 'Why does my bot show as offline?', a: 'The bot only appears online when your Hatcher agent is running. Start or restart your agent from the dashboard.' },
      { q: 'Can the bot respond to DMs?', a: 'Yes, by default Discord bots can receive and respond to direct messages from server members.' },
      { q: 'Do I need to verify my bot?', a: 'Only if your bot is in more than 100 servers. For personal or small community use, no verification is needed.' },
      { q: 'The bot is online but not responding to messages.', a: 'Make sure "Message Content Intent" is enabled in the Developer Portal. Without it, the bot cannot read message content.' },
    ],
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: Phone,
    color: '#25D366',
    difficulty: 'Medium',
    cost: 'Free (1K msgs/mo)',
    setupTime: '15 min',
    warnings: [
      'The On-Premises API was discontinued in October 2025. Only the Cloud API is supported.',
      'Since July 2025, WhatsApp charges per template message. Service conversations (user-initiated) get 1,000 free per month.',
    ],
    prerequisites: [
      'A Meta (Facebook) account',
      'A Meta Business account (free to create)',
      'A phone number not already registered with WhatsApp',
    ],
    steps: [
      {
        title: 'Create a Meta App',
        content: 'Go to the Meta Developer Portal and create a new app. Select "Business" as the app type.',
        code: 'https://developers.facebook.com/',
      },
      {
        title: 'Add WhatsApp product',
        content: 'In your app dashboard, click "Add Products" and select WhatsApp. Follow the setup wizard to link your business account.',
      },
      {
        title: 'Get your access token',
        content: 'In WhatsApp > API Setup, you\'ll see a temporary token (valid 24 hours). For production use, create a System User in Business Settings > Users > System Users, then generate a permanent token with the "whatsapp_business_messaging" permission.',
      },
      {
        title: 'Set up the webhook',
        content: 'WhatsApp requires a webhook URL to send incoming messages. Hatcher provides this automatically when you configure the integration. The webhook URL will be shown in your agent\'s Integrations tab.',
      },
      {
        title: 'Configure in Hatcher',
        content: 'Go to your agent\'s Integrations tab. Select WhatsApp, paste your access token and phone number ID, and save.',
      },
    ],
    hatcherConfig: [
      { field: 'Access Token', value: 'EAABs...', description: 'Permanent System User token (not the 24h temporary one)' },
      { field: 'Phone Number ID', value: '1234567890', description: 'From WhatsApp > API Setup in the Meta dashboard' },
      { field: 'Verify Token', value: 'auto-generated', description: 'Hatcher generates this for webhook verification' },
    ],
    testSteps: [
      'Send a WhatsApp message to the phone number linked to your app',
      'Your agent should respond within a few seconds',
      'Check the Logs tab in Hatcher for message delivery status',
      'Verify webhook status in the Meta Developer Portal',
    ],
    faq: [
      { q: 'How much does WhatsApp cost?', a: 'User-initiated conversations (service conversations) get 1,000 free per month. Business-initiated messages using templates are charged per message based on your country. See Meta\'s pricing page for details.' },
      { q: 'Why is my token expiring?', a: 'The temporary token from API Setup only lasts 24 hours. Create a System User and generate a permanent token instead.' },
      { q: 'Can I use my personal WhatsApp number?', a: 'No, you need a phone number that is not already registered with WhatsApp or WhatsApp Business. Consider using a dedicated number.' },
      { q: 'Messages are not being received by my agent.', a: 'Check that the webhook URL is correctly configured in the Meta dashboard and that your agent is running. Also verify the webhook subscription includes "messages" events.' },
    ],
  },
  slack: {
    name: 'Slack',
    icon: Slack,
    color: '#E01E5A',
    difficulty: 'Easy',
    cost: 'Free',
    setupTime: '5 min',
    warnings: [
      'Legacy Slack bots were discontinued in March 2025. You must create a new Slack app.',
      'Documentation has moved to docs.slack.dev (the new Slack developer docs).',
    ],
    prerequisites: [
      'A Slack workspace you have admin access to',
      'A Slack account',
    ],
    steps: [
      {
        title: 'Create a new Slack App',
        content: 'Go to the Slack API dashboard and click "Create New App." Choose "From scratch" and select your workspace.',
        code: 'https://api.slack.com/apps',
      },
      {
        title: 'Configure bot token scopes',
        content: 'Go to OAuth & Permissions. Under "Bot Token Scopes," add: chat:write, channels:read, and app_mentions:read. These are the minimum scopes needed.',
      },
      {
        title: 'Install to workspace',
        content: 'Click "Install to Workspace" at the top of the OAuth & Permissions page. Authorize the app. Copy the "Bot User OAuth Token" that starts with xoxb-.',
      },
      {
        title: 'Enable Event Subscriptions',
        content: 'Go to Event Subscriptions and toggle it on. Subscribe to these bot events: app_mention and message.channels. The Request URL will be provided by Hatcher when you configure the integration.',
      },
      {
        title: 'Configure in Hatcher',
        content: 'Go to your agent\'s Integrations tab. Select Slack, paste your Bot User OAuth Token, and save.',
      },
    ],
    hatcherConfig: [
      { field: 'Bot Token', value: 'xoxb-1234567890-...', description: 'Bot User OAuth Token from OAuth & Permissions' },
      { field: 'Signing Secret', value: 'abc123...', description: 'Found in Basic Information > App Credentials' },
    ],
    testSteps: [
      'Open your Slack workspace',
      'Invite the bot to a channel: /invite @YourBot',
      'Mention the bot: @YourBot hello',
      'The agent should respond in the thread or channel',
      'Check the Logs tab in Hatcher to verify',
    ],
    faq: [
      { q: 'Why can\'t my bot see messages?', a: 'Make sure you\'ve subscribed to the message.channels event in Event Subscriptions. Also verify the bot has been invited to the channel.' },
      { q: 'Can the bot respond in threads?', a: 'Yes, Hatcher agents automatically respond in threads when the message is in a thread context.' },
      { q: 'I had a legacy bot. Can I migrate it?', a: 'No, legacy bots cannot be migrated. You need to create a new Slack app following the steps above. See docs.slack.dev for the migration guide.' },
      { q: 'How do I use slash commands?', a: 'Go to Slash Commands in your Slack app settings and create a new command. Point the request URL to your Hatcher webhook endpoint.' },
    ],
  },
  twitter: {
    name: 'Twitter / X',
    icon: Twitter,
    color: 'var(--text-primary)',
    difficulty: 'Advanced',
    cost: 'Pay-per-use',
    setupTime: '10 min',
    warnings: [
      'MAJOR CHANGE (January 2026): Fixed API tiers were removed. Twitter/X now uses Pay-Per-Use pricing only.',
      'The Free tier is write-only (1,500 tweets/month). It CANNOT read tweets, mentions, or timelines.',
      'To read tweets and mentions, you need Pay-Per-Use credits loaded in your developer account.',
    ],
    prerequisites: [
      'An X (Twitter) account',
      'X Developer Portal access',
      'Pay-Per-Use credits for read access (optional for write-only)',
    ],
    steps: [
      {
        title: 'Access the Developer Portal',
        content: 'Go to the X Developer Portal and sign in. If you don\'t have developer access, apply for it.',
        code: 'https://developer.x.com/',
      },
      {
        title: 'Create a Project and App',
        content: 'Create a new Project, then create an App within it. Choose the appropriate environment (production or development).',
      },
      {
        title: 'Set app permissions',
        content: 'In your App Settings, set the app permissions to "Read and Write." This is required for your agent to both read mentions and post tweets.',
      },
      {
        title: 'Generate all four keys',
        content: 'Go to Keys and Tokens. Generate and copy all four credentials: API Key (Consumer Key), API Secret (Consumer Secret), Access Token, and Access Token Secret.',
      },
      {
        title: 'Load Pay-Per-Use credits (for read access)',
        content: 'If you want your agent to read mentions and timelines, go to the Billing section and load credits. Without credits, the free tier only allows posting tweets.',
      },
      {
        title: 'Configure in Hatcher',
        content: 'Go to your agent\'s Integrations tab. Select Twitter/X and enter all four keys.',
      },
    ],
    hatcherConfig: [
      { field: 'API Key', value: 'xABC123...', description: 'Also called Consumer Key' },
      { field: 'API Secret', value: 'xDEF456...', description: 'Also called Consumer Secret' },
      { field: 'Access Token', value: '12345-xGHI...', description: 'User-specific access token' },
      { field: 'Access Token Secret', value: 'xJKL789...', description: 'User-specific access token secret' },
    ],
    testSteps: [
      'Post a test tweet by sending a command to your agent',
      'Check your Twitter profile to verify the tweet appeared',
      'If using read access, mention your bot account and verify it detects the mention',
      'Check the Logs tab in Hatcher for API call status',
    ],
    faq: [
      { q: 'Why can\'t my agent read mentions?', a: 'The free tier is write-only. You need Pay-Per-Use credits loaded in your X Developer account to access read endpoints.' },
      { q: 'How much does the Pay-Per-Use API cost?', a: 'Pricing varies by endpoint. Check the X Developer Portal billing page for current rates. Tweets posted are free (up to 1,500/month on free tier).' },
      { q: 'Can I use this for automated trading signals?', a: 'Yes, but be aware of X\'s automation rules. Automated tweets must comply with the X Developer Agreement and Policy.' },
      { q: 'I\'m getting 403 Forbidden errors.', a: 'Check that your app permissions are set to "Read and Write" and that you regenerated tokens AFTER changing permissions. Token permissions are locked at generation time.' },
    ],
  },
  signal: {
    name: 'Signal',
    icon: Signal,
    color: '#3A76F0',
    difficulty: 'Advanced',
    cost: 'Free',
    setupTime: '30 min',
    warnings: [
      'Signal does not have an official API. This integration uses signal-cli, an unofficial command-line client.',
      'You need a spare phone number that is NOT your main Signal number.',
      'This is the most complex integration. If you\'re new, we recommend starting with Telegram or Discord instead.',
    ],
    prerequisites: [
      'A spare phone number (not registered with Signal)',
      'Ability to receive SMS or voice calls on that number',
      'Familiarity with command-line tools',
    ],
    steps: [
      {
        title: 'Understand the limitations',
        content: 'Signal has no official bot API. The integration uses signal-cli, which registers as a regular Signal user. This means your agent "is" a Signal user with a phone number, not a bot account.',
      },
      {
        title: 'Solve the CAPTCHA',
        content: 'Signal requires a CAPTCHA for registration. You\'ll need to complete it in a browser and extract the captcha token. Hatcher provides instructions in the Integrations tab.',
      },
      {
        title: 'Register the phone number',
        content: 'Use the captcha token to register your spare phone number with Signal. You\'ll receive an SMS verification code.',
      },
      {
        title: 'Verify the number',
        content: 'Enter the SMS verification code to complete registration. Your phone number is now a Signal account controlled by your agent.',
      },
      {
        title: 'Configure in Hatcher',
        content: 'Go to your agent\'s Integrations tab. Select Signal and enter your phone number and the verification details.',
      },
    ],
    hatcherConfig: [
      { field: 'Phone Number', value: '+1234567890', description: 'The spare phone number registered with Signal' },
    ],
    testSteps: [
      'Add the phone number as a Signal contact on another device',
      'Send a Signal message to that number',
      'Your agent should respond within a few seconds',
      'Check the Logs tab in Hatcher for message delivery',
    ],
    faq: [
      { q: 'Can I use my personal Signal number?', a: 'No, registering with signal-cli will disconnect your phone\'s Signal app. Always use a dedicated spare number.' },
      { q: 'Is this secure?', a: 'Signal messages are end-to-end encrypted. However, signal-cli stores keys locally in the container. The container is isolated and encrypted at rest.' },
      { q: 'Why is this so complicated?', a: 'Signal prioritizes privacy and doesn\'t offer a bot API. The signal-cli workaround is the only way to integrate. For an easier alternative, consider Telegram.' },
      { q: 'My registration keeps failing.', a: 'Signal has anti-spam measures. Try using a different phone number, wait a few hours between attempts, and make sure the CAPTCHA token is fresh.' },
    ],
  },
};

// ── Page ────────────────────────────────────────────────────────

export default function PlatformGuidePage() {
  const params = useParams();
  const platformId = params.platform as string;
  const guide = GUIDES[platformId];

  if (!guide) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Platform Not Found</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            We don&apos;t have a guide for &ldquo;{platformId}&rdquo; yet.
          </p>
          <Link
            href="/docs/integrations"
            className="inline-flex items-center gap-2 rounded-xl bg-[#06b6d4] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#06b6d4]/20 transition-all duration-200 hover:bg-[#0891b2]"
          >
            <ArrowLeft size={16} />
            All Integrations
          </Link>
        </div>
      </div>
    );
  }

  const Icon = guide.icon;

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-3xl">

        {/* ── Back link ─────────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-8">
          <Link
            href="/docs/integrations"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[#06b6d4] transition-colors duration-200"
          >
            <ArrowLeft size={16} />
            All Integrations
          </Link>
        </motion.div>

        {/* ── Header ─────────────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${guide.color}18` }}
            >
              <Icon size={28} style={{ color: guide.color }} />
            </div>
            <div>
              <h1
                className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                {guide.name}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <DifficultyBadge level={guide.difficulty} />
                <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <Clock size={12} />
                  {guide.setupTime}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <DollarSign size={12} />
                  {guide.cost}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Warnings ───────────────────────────────────────── */}
        {guide.warnings && guide.warnings.length > 0 && (
          <motion.div variants={cardVariants} className="mb-8 space-y-2">
            {guide.warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-300/80 leading-relaxed">{warning}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Prerequisites ──────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-8">
          <div className="card glass-noise p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#06b6d4]/15 flex items-center justify-center">
                <Shield size={16} className="text-[#06b6d4]" />
              </div>
              <h2
                className="text-lg font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Prerequisites
              </h2>
            </div>
            <ul className="space-y-2">
              {guide.prerequisites.map((prereq, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                  {prereq}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* ── Steps ──────────────────────────────────────────── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mb-8 space-y-3"
        >
          <div className="flex items-center gap-2.5 mb-2 px-1">
            <h2
              className="text-lg font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              Setup Steps
            </h2>
          </div>
          {guide.steps.map((step, i) => (
            <motion.div key={i} variants={staggerItem}>
              <div className="card glass-noise p-5">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-[#06b6d4]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-[#06b6d4]">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{step.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{step.content}</p>
                    {step.code && (
                      <div className="mt-3">
                        <CopyBlock text={step.code} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Configure in Hatcher ────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-8">
          <div className="card glass-noise p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${guide.color}18` }}
              >
                <Icon size={16} style={{ color: guide.color }} />
              </div>
              <h2
                className="text-lg font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Configure in Hatcher
              </h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
              Navigate to your agent&apos;s <strong className="text-[var(--text-primary)]">Integrations</strong> tab and fill in the following fields:
            </p>
            <div className="space-y-3">
              {guide.hatcherConfig.map((cfg, i) => (
                <div key={i} className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{cfg.field}</span>
                  </div>
                  <code className="text-sm font-[family-name:var(--font-mono)] text-[#06b6d4]">{cfg.value}</code>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{cfg.description}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Testing ────────────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-8">
          <div className="card glass-noise p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 size={16} className="text-green-400" />
              </div>
              <h2
                className="text-lg font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Testing
              </h2>
            </div>
            <ol className="space-y-2">
              {guide.testSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                  <span className="w-5 h-5 rounded-full bg-[#06b6d4]/15 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-[#06b6d4]">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </motion.div>

        {/* ── Troubleshooting ────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-8">
          <div className="flex items-center gap-2.5 mb-4 px-1">
            <h2
              className="text-lg font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              Troubleshooting
            </h2>
          </div>
          <div className="space-y-2">
            {guide.faq.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </motion.div>

        {/* ── Next Steps ─────────────────────────────────────── */}
        <motion.div variants={cardVariants}>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/docs/integrations"
              className="flex-1 group card glass-noise p-5 flex items-center gap-4 transition-all duration-200 hover:border-[rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.06)]"
            >
              <ArrowLeft size={18} className="text-[var(--text-muted)] group-hover:text-[#06b6d4] transition-colors" />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#06b6d4] transition-colors">All Integrations</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Browse other platform guides</p>
              </div>
            </Link>
            <Link
              href="/docs/api"
              className="flex-1 group card glass-noise p-5 flex items-center gap-4 transition-all duration-200 hover:border-[rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.06)]"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#06b6d4] transition-colors">API Reference</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Programmatic control of agents</p>
              </div>
              <ArrowRight size={18} className="text-[var(--text-muted)] group-hover:text-[#06b6d4] transition-colors" />
            </Link>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
