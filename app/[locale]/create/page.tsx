'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import { BYOK_PROVIDERS, getBYOKProvider } from '@hatcher/shared';
import type { BYOKProvider } from '@hatcher/shared';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cpu,
  Eye,
  EyeOff,
  Key,
  Loader2,
  MessageCircle,
  Rocket,
  Search,
  Send,
  Settings2,
  Sparkles,
  Gem,
  X,
  Zap,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;

type LLMChoice = 'free_groq' | 'byok';

// BYOK_PROVIDERS imported from @hatcher/shared

// ── Templates (fetched from API) ─────────────────────────────

interface ApiTemplate {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  personality: string;
  topics: string[];
  suggestedSkills: string[];
  recommendedSkills?: {
    openclaw: string[];
    hermes: string[];
    elizaos: string[];
    milady: string[];
  };
}

/** Format a ClawHub slug or plugin name for display: "github" → "GitHub", "in-depth-research" → "In-Depth Research" */
function formatSkillName(name: string): string {
  const overrides: Record<string, string> = {
    github: 'GitHub', jira: 'Jira', slack: 'Slack', todoist: 'Todoist',
    'desearch-web-search': 'DeSearch', 'in-depth-research': 'Research',
    'market-research-agent': 'Market Research', 'neural-memory': 'Neural Memory',
    'human-writing': 'Human Writing', 'code-quality': 'Code Quality',
    'portfolio-tracker': 'Portfolio Tracker', 'blockchain-data': 'Blockchain Data',
    'trading-signals': 'Trading Signals', 'solana-tools': 'Solana Tools',
    'social-media-manager': 'Social Media', 'seo-assistant': 'SEO Assistant',
    'email-assistant': 'Email Assistant', 'pdf-reader': 'PDF Reader',
    'notion-tools': 'Notion', 'google-sheets': 'Google Sheets',
    'todoist-task-manager': 'Todoist', 'calendar-assistant': 'Calendar',
    '@elizaos/plugin-github': 'GitHub', '@elizaos/plugin-bootstrap': 'Bootstrap',
    '@elizaos/plugin-node': 'Node Runtime', '@elizaos/plugin-sql': 'Database',
  };
  if (overrides[name]) return overrides[name];
  return name
    .replace(/^@[^/]+\/plugin-/, '')
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const OPENCLAW_SKILLS_LIST = ['web_search', 'calculator', 'weather', 'code_interpreter', 'file_manager', 'image_gen'];

// ── Platform definitions ────────────────────────────────────

const PLATFORMS = [
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '\u2708\uFE0F',
    description: 'Deploy as a Telegram bot',
    frameworks: ['openclaw', 'hermes', 'elizaos', 'milady'],
    fields: [
      { key: 'TELEGRAM_BOT_TOKEN', label: 'Bot Token', placeholder: 'Token from @BotFather', helper: 'Message @BotFather on Telegram \u2192 /newbot \u2192 copy the token', required: true },
    ],
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: '\uD83C\uDFAE',
    description: 'Deploy as a Discord bot',
    frameworks: ['openclaw', 'hermes', 'elizaos', 'milady'],
    fields: [
      { key: 'DISCORD_API_TOKEN', label: 'Bot Token', placeholder: 'Discord bot token', helper: 'Discord Developer Portal \u2192 New Application \u2192 Bot \u2192 Copy Token', required: true },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '\uD83D\uDCAC',
    description: 'Connect via QR code',
    // Only OpenClaw supports non-interactive QR pairing from the dashboard.
    // Hermes needs a TTY; Milady uses Meta Cloud API tokens instead.
    frameworks: ['openclaw'],
    fields: [],
    note: 'QR pairing will be available after deployment',
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: '\uD83D\uDCBC',
    description: 'Deploy in Slack workspace',
    frameworks: ['openclaw', 'hermes', 'elizaos', 'milady'],
    fields: [
      { key: 'SLACK_BOT_TOKEN', label: 'Bot Token', placeholder: 'xoxb-...', helper: 'Slack API \u2192 Create App \u2192 OAuth & Permissions \u2192 Bot Token', required: true },
    ],
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: '\uD835\uDD4F',
    description: 'Post, reply and engage on X',
    frameworks: ['openclaw', 'elizaos', 'milady'],
    fields: [
      { key: 'XURL_CLIENT_ID', label: 'OAuth2 Client ID', placeholder: 'Client ID from X Developer Portal', required: true },
      { key: 'XURL_CLIENT_SECRET', label: 'OAuth2 Client Secret', placeholder: 'Client Secret', required: true },
    ],
  },
];

// ── Animation variants ───────────────────────────────────────

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const stepVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.2, ease: [0.55, 0.06, 0.68, 0.19] as const } },
};

const cardHover = {
  y: -3,
  transition: { duration: 0.2 },
};

const staggerContainer = {
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ── Glass card helper ────────────────────────────────────────

const cardClass = 'card glass-noise';

// ── Main Component ───────────────────────────────────────────

export default function CreatePage() {
  const t = useTranslations('create');
  const STEP_LABELS: Record<Step, string> = {
    1: t('stepLabels.style'),
    2: t('stepLabels.category'),
    3: t('stepLabels.template'),
    4: t('stepLabels.setUp'),
    5: t('stepLabels.launch'),
  };
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);

  // ── LLM selection state ──
  const [llmChoice, setLlmChoice] = useState<LLMChoice>('free_groq');
  const [byokProvider, setByokProvider] = useState<BYOKProvider>('openai');
  const [byokModel, setByokModel] = useState('');
  const [byokCustomModel, setByokCustomModel] = useState(false);
  const [byokApiKey, setByokApiKey] = useState('');
  const [byokBaseUrl, setByokBaseUrl] = useState('');
  // Credits model removed — using Groq free or BYOK only

  // ── Templates (fetched from API) ──
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [apiCategories, setApiCategories] = useState<string[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [templateSearch, setTemplateSearch] = useState('');
  // Track which template was last auto-applied so we can override it when template changes
  const lastAppliedTemplateRef = useRef<string>('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  useEffect(() => {
    void fetch(`${apiUrl}/api/templates?limit=200`)
      .then(r => r.json() as Promise<{ templates: ApiTemplate[]; categories: string[] }>)
      .then(data => {
        setTemplates(data.templates);
        const sorted = [...data.categories].sort();
        setApiCategories(sorted);
        setSelectedCategory(prev => prev || sorted[0] || '');
      })
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, [apiUrl]);

  // ── Template state (pre-select via ?template= URL param) ──
  const searchParams = useSearchParams();
  const preselectedTemplate = searchParams.get('template') ?? 'custom';
  const validPreselect = preselectedTemplate; // will be validated dynamically
  const [selectedTemplate, setSelectedTemplate] = useState(validPreselect);
  const [selectedFramework, setSelectedFramework] = useState<'openclaw' | 'hermes' | 'elizaos' | 'milady'>('openclaw');

  // ── OpenClaw form state ──
  const [openclawForm, setOpenclawForm] = useState({
    name: '',
    description: '',
    systemPrompt: '',  // custom override only — blank means "use template default"
  });
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [openclawSkills, setOpenclawSkills] = useState<string[]>(['web_search', 'calculator']);
  const [hermesTools, setHermesTools] = useState<string[]>(['web_search', 'memory', 'calculator']);
  const [elizaPlugins, setElizaPlugins] = useState<string[]>(['@elizaos/plugin-bootstrap', '@elizaos/plugin-node', '@elizaos/plugin-sql']);
  const [miladyCapabilities, setMiladyCapabilities] = useState<string[]>(['chat', 'defi', 'social']);

  // ── ElizaOS-specific form state ──
  const [elizaBio, setElizaBio] = useState('');
  const [elizaLore, setElizaLore] = useState('');
  const [elizaStyle, setElizaStyle] = useState('');
  const [elizaTopics, setElizaTopics] = useState('');
  const [elizaAdjectives, setElizaAdjectives] = useState('');

  // ── Milady-specific form state ──
  const [miladyPersonality, setMiladyPersonality] = useState<'helpful' | 'tsundere' | 'unhinged' | 'custom'>('helpful');

  // ── Advanced create options ──
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [searchProvider, setSearchProvider] = useState('brave');
  const [enableTTS, setEnableTTS] = useState(false);
  const [ttsProvider, setTtsProvider] = useState('elevenlabs');
  const [sessionScope, setSessionScope] = useState('per-peer');
  const [enableMemory, setEnableMemory] = useState(true);
  const [dbBackend, setDbBackend] = useState('pglite');
  const [hermesPersonality, setHermesPersonality] = useState('default');
  const [approvalMode, setApprovalMode] = useState('auto');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [enableImageGen, setEnableImageGen] = useState(false);
  const [enableVoice, setEnableVoice] = useState(false);
  const [localFirst, setLocalFirst] = useState(true);

  // ── Platform selection state ──
  const [platformsEnabled, setPlatformsEnabled] = useState<Record<string, boolean>>({});
  const [platformSecrets, setPlatformSecrets] = useState<Record<string, Record<string, string>>>({});
  const [platformSecretVisibility, setPlatformSecretVisibility] = useState<Record<string, boolean>>({});

  // ── Test chat state ──
  const [testMessages, setTestMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [showTestChat, setShowTestChat] = useState(false);

  const agentName = openclawForm.name;
  const agentDesc = openclawForm.description;

  // ── Helpers ──

  /** Pre-populate form fields from the selected template when moving to step 4.
   *  Accepts an optional templateId override for when state hasn't flushed yet (e.g. search result click). */
  function applyTemplate(templateId?: string) {
    const tid = templateId ?? selectedTemplate;
    if (tid === 'custom') return;
    const tpl = templates.find((t) => t.id === tid);
    if (!tpl) return;

    // Find previous template to detect if user manually edited the fields
    const prevTpl = templates.find((t) => t.id === lastAppliedTemplateRef.current);
    const prevDescVal = (prevTpl?.description || prevTpl?.personality || '').slice(0, 140);

    // Best description: prefer description field, fall back to personality if empty
    const bestDesc = (tpl.description?.trim() ? tpl.description : (tpl.personality || '')).slice(0, 140);

    const updates: Partial<typeof openclawForm> = {};
    // Override name only if empty OR still matches the previous template's name (not manually edited)
    if (!openclawForm.name.trim() || openclawForm.name.trim() === (prevTpl?.name ?? '')) {
      updates.name = tpl.name;
    }
    // Override description only if empty OR still matches the previous template's description
    if (!openclawForm.description.trim() || openclawForm.description.trim() === prevDescVal) {
      updates.description = bestDesc;
    }
    // Auto-select skills from suggestedSkills
    if (tpl.suggestedSkills.length > 0) {
      setOpenclawSkills(tpl.suggestedSkills.filter(s => OPENCLAW_SKILLS_LIST.includes(s)));
    }
    if (Object.keys(updates).length > 0) {
      setOpenclawForm((prev) => ({ ...prev, ...updates }));
    }
    lastAppliedTemplateRef.current = tid;
  }

  const searchResults = useMemo(() => {
    if (!templateSearch.trim()) return [];
    const q = templateSearch.toLowerCase();
    return templates.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [templates, templateSearch]);

  function toggleSkill(skill: string) {
    setOpenclawSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function toggleHermesTool(tool: string) {
    setHermesTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  }

  function toggleElizaPlugin(plugin: string) {
    setElizaPlugins((prev) =>
      prev.includes(plugin) ? prev.filter((p) => p !== plugin) : [...prev, plugin]
    );
  }

  function toggleMiladyCapability(cap: string) {
    setMiladyCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  }

  // Build LLM config for payload
  function getLLMConfig() {
    if (llmChoice === 'free_groq') {
      return { modelProvider: 'groq', model: 'meta-llama/llama-4-scout-17b-16e-instruct' };
    }
    if (llmChoice === 'byok') {
      return {
        modelProvider: byokProvider,
        model: byokModel || undefined,
        byok: {
          provider: byokProvider,
          apiKey: byokApiKey || undefined,
          model: byokModel || undefined,
          baseUrl: byokBaseUrl || undefined,
        },
      };
    }
    // Fallback: use free groq
    return { modelProvider: 'groq', model: 'meta-llama/llama-4-scout-17b-16e-instruct' };
  }

  function getLLMSummary(): string {
    if (llmChoice === 'free_groq') return t('llmFreeSummary');
    const prov = getBYOKProvider(byokProvider);
    return t('llmByokSummary', { provider: prov?.name ?? byokProvider, model: byokModel ? ` / ${byokModel}` : '' });
  }

  // ── Test Chat ──

  async function handleTestChat() {
    if (!testInput.trim() || testLoading) return;
    const userMsg = testInput.trim();
    setTestInput('');
    setTestMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setTestLoading(true);

    const systemPrompt = openclawForm.systemPrompt || `You are ${openclawForm.name || 'a helpful AI agent'}.`;
    const llmConfig = getLLMConfig();

    try {
      const res = await api.testChat(userMsg, systemPrompt, llmConfig.model, llmConfig.modelProvider);
      if (res.success && res.data?.text) {
        setTestMessages(prev => [...prev, { role: 'assistant', content: res.data.text }]);
      } else {
        // Fallback: show simulated preview if API returns an error
        const name = openclawForm.name || 'Your Agent';
        const promptSnippet = systemPrompt.substring(0, 100);
        setTestMessages(prev => [...prev, {
          role: 'assistant',
          content: `Hi! I'm ${name}. This is a preview of how I'll respond. Deploy me to start real conversations!\n\nYou said: "${userMsg}"\n\nMy personality is defined by: ${promptSnippet}${promptSnippet.length >= 100 ? '...' : ''}`,
        }]);
      }
    } catch {
      // Fallback: simulated preview on network/unexpected error
      const name = openclawForm.name || 'Your Agent';
      const promptSnippet = systemPrompt.substring(0, 100);
      setTestMessages(prev => [...prev, {
        role: 'assistant',
        content: `Hi! I'm ${name}. This is a preview of how I'll respond. Deploy me to start real conversations!\n\nYou said: "${userMsg}"\n\nMy personality is defined by: ${promptSnippet}${promptSnippet.length >= 100 ? '...' : ''}`,
      }]);
    }
    setTestLoading(false);
  }

  // ── Launch ──

  const handleLaunch = async () => {
    setLaunching(true);

    try {
      const llm = getLLMConfig();

      // Gather enabled platforms and their secrets
      const enabledPlatforms = Object.entries(platformsEnabled)
        .filter(([, enabled]) => enabled)
        .map(([id]) => id);

      // Flatten platform secrets to root level — build-spec.ts reads them as agentConfig['TELEGRAM_BOT_TOKEN'] etc.
      const flatSecrets: Record<string, string> = {};
      for (const [platformId, secrets] of Object.entries(platformSecrets)) {
        if (platformsEnabled[platformId]) {
          Object.assign(flatSecrets, secrets);
        }
      }

      const payload: Parameters<typeof api.createAgent>[0] = {
        name: openclawForm.name,
        ...(openclawForm.description.trim() ? { description: openclawForm.description.trim() } : {}),
        framework: selectedFramework,
        template: selectedTemplate,
        config: {
          model: llm.model ?? 'meta-llama/llama-4-scout-17b-16e-instruct',
          provider: llm.modelProvider,
          ...(selectedFramework === 'openclaw' ? { skills: openclawSkills } : {}),
          ...(selectedFramework === 'hermes' ? { tools: hermesTools } : {}),
          ...(selectedFramework === 'elizaos' ? { plugins: elizaPlugins } : {}),
          ...(selectedFramework === 'milady' ? { capabilities: miladyCapabilities } : {}),
          ...(selectedFramework === 'elizaos' ? {
            bio: elizaBio.trim() || undefined,
            lore: elizaLore.trim() || undefined,
            topics: elizaTopics.split(',').map(s => s.trim()).filter(Boolean),
            adjectives: elizaAdjectives.split(',').map(s => s.trim()).filter(Boolean),
            style: elizaStyle.trim() ? {
              all: elizaStyle.split('\n').map(s => s.trim()).filter(Boolean),
            } : undefined,
          } : {}),
          ...(selectedFramework === 'milady' ? {
            miladyPersonality,
          } : {}),
          systemPrompt: openclawForm.systemPrompt.trim() || '',
          // Note: template system prompt is fetched server-side from AgentTemplate.soulMd
          // BYOK config -- backend reads agentConfig['byok']
          ...(llm.byok ? { byok: llm.byok } : {}),
          // Platform integrations — secrets flattened to root so build-spec.ts can extract them
          ...(enabledPlatforms.length > 0 ? { platforms: enabledPlatforms } : {}),
          ...flatSecrets,
          // Advanced options (framework-specific)
          ...(selectedFramework === 'openclaw' && {
            sessionScope,
            webSearch: enableWebSearch ? { provider: searchProvider } : undefined,
            tts: enableTTS ? { provider: ttsProvider } : undefined,
          }),
          ...(selectedFramework === 'hermes' && {
            personality: hermesPersonality,
            enableMemory,
            approvalMode,
          }),
          ...(selectedFramework === 'elizaos' && {
            dbBackend,
            enableImageGen,
            enableVoice,
          }),
          ...(selectedFramework === 'milady' && {
            dbBackend,
            localFirst,
          }),
        },
      };

      const res = await api.createAgent(payload);

      if (!res.success) {
        toast('error', res.error ?? 'Failed to create agent');
        setLaunching(false);
        return;
      }

      // Auto-deploy — best-effort, don't block on failure
      try {
        await api.startAgent(res.data.id);
      } catch (deployErr) {
        console.warn('Auto-deploy failed; user can deploy manually from dashboard:', deployErr);
      }

      // Success -- confetti!
      track.createAgent(selectedFramework);
      setLaunching(false);
      setLaunched(true);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['var(--color-accent)', 'var(--color-accent)', '#fed7aa', '#FFFFFF'],
      });

      setTimeout(() => {
        router.push(`/dashboard/agent/${res.data.id}?new=1`);
      }, 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast('error', `Failed to create agent: ${msg}`);
      setLaunching(false);
    }
  };

  // ── Auth gates ──

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className={cn(cardClass, 'p-10 max-w-md w-full text-center')}>
          <Loader2 className="w-10 h-10 text-[var(--color-accent)] animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)] text-sm">{t('authLoading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="min-h-screen flex items-center justify-center px-4"
      >
        <div className={cn(cardClass, 'p-10 max-w-md w-full text-center')}>
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 flex items-center justify-center mx-auto mb-6">
            <Key className="w-8 h-8 text-[var(--color-accent)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>{t('authRequired')}</h1>
          <p className="text-[var(--text-secondary)] text-sm mb-8">{t('authRequiredBody')}</p>
          <Link href="/login" className="btn-primary inline-block">
            {t('signIn')}
          </Link>
        </div>
      </motion.div>
    );
  }

  // ── Validation ──

  const selectedByokProvider = getBYOKProvider(byokProvider);
  const nameValid = openclawForm.name.trim().length >= 3 && /^[a-zA-Z0-9 \-:'.()&]+$/.test(openclawForm.name.trim());
  const isConfigValid = nameValid
    && (llmChoice !== 'byok' || !selectedByokProvider?.requiresApiKey || byokApiKey.trim().length > 0);

  return (
    <motion.div
      className="min-h-screen"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Page title — editorial, left-aligned, consistent with landing */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('eyebrow')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>{t('heading')}</h1>
          <p className="text-[var(--text-secondary)]">{t('subheading')}</p>
        </motion.div>

        {/* ── STEP INDICATOR ─────────────────────────────────────── */}
        <div className="mb-12">
          {/* Progress bar — solid accent, no gradient */}
          <div className="max-w-md mx-auto mb-8 px-4">
            <div className="h-1 rounded-full bg-[var(--border-default)] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[var(--color-accent)]"
                initial={{ width: '0%' }}
                animate={{ width: step === 1 ? '8%' : step === 2 ? '25%' : step === 3 ? '50%' : step === 4 ? '75%' : '100%' }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
          </div>
          <div className="grid grid-cols-5 w-full px-1" role="list" aria-label={t('stepsAriaLabel')}>
            {([1, 2, 3, 4, 5] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center" role="listitem" aria-current={s === step ? 'step' : undefined}>
                {/* Step circle + label */}
                <div className="flex flex-col items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                  <motion.div
                    className={cn(
                      'w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[10px] sm:text-sm font-bold transition-all duration-300 border-2',
                      s < step
                        ? 'bg-[var(--accent-600)] border-[var(--accent-600)] text-white shadow-[0_0_16px_rgba(6,182,212,0.3)]'
                        : s === step
                          ? 'bg-[rgba(6,182,212,0.1)] border-[var(--accent-600)] text-[var(--accent-400)]'
                          : 'bg-transparent border-[var(--border-default)] text-[var(--text-muted)]'
                    )}
                    animate={s === step ? { boxShadow: ['0 0 0 0 rgba(6,182,212,0)', '0 0 16px 6px rgba(6,182,212,0.2)', '0 0 0 0 rgba(6,182,212,0)'] } : {}}
                    transition={s === step ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                  >
                    {s < step ? (
                      <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200 }}>
                        <Check className="w-5 h-5" />
                      </motion.div>
                    ) : s}
                  </motion.div>
                  <span
                    className={cn(
                      'text-[8px] sm:text-[11px] w-full text-center font-medium leading-tight px-0.5',
                      s < step ? 'text-[var(--accent-400)]' : s === step ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                    )}
                  >
                    {STEP_LABELS[s]}
                  </span>
                </div>
                {/* Connecting line */}
                {i < 4 && (
                  <div className="relative w-2 sm:w-5 flex-shrink-0 mb-5 sm:mb-6">
                    <div className="h-0.5 rounded-full bg-[var(--border-default)]" />
                    <motion.div
                      className="absolute top-0 left-0 h-0.5 rounded-full"
                      style={{ background: 'var(--color-accent)' }}
                      initial={{ width: '0%' }}
                      animate={{ width: s < step ? '100%' : '0%' }}
                      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Step Content with AnimatePresence ─────────────────── */}
        <AnimatePresence mode="wait">
          {/* ── STEP 1: FRAMEWORK ──────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('step1Heading')}</h2>
              <p className="text-[var(--text-secondary)] text-sm mb-8">
                {t('step1Subheading')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {([
                  { key: 'openclaw', name: 'OpenClaw', icon: Cpu, descKey: 'frameworkFeatures.openclaw.desc', features: ['frameworkFeatures.openclaw.f1', 'frameworkFeatures.openclaw.f2', 'frameworkFeatures.openclaw.f3'] },
                  { key: 'hermes', name: 'Hermes', icon: Zap, descKey: 'frameworkFeatures.hermes.desc', features: ['frameworkFeatures.hermes.f1', 'frameworkFeatures.hermes.f2', 'frameworkFeatures.hermes.f3'] },
                  { key: 'elizaos', name: 'ElizaOS', icon: Bot, descKey: 'frameworkFeatures.elizaos.desc', features: ['frameworkFeatures.elizaos.f1', 'frameworkFeatures.elizaos.f2', 'frameworkFeatures.elizaos.f3'] },
                  { key: 'milady', name: 'Milady', icon: Gem, descKey: 'frameworkFeatures.milady.desc', features: ['frameworkFeatures.milady.f1', 'frameworkFeatures.milady.f2', 'frameworkFeatures.milady.f3'] },
                ] as const).map((fw) => {
                  const selected = selectedFramework === fw.key;
                  return (
                    <motion.button
                      key={fw.key}
                      whileHover={cardHover}
                      onClick={() => setSelectedFramework(fw.key)}
                      className={cn(
                        'p-6 rounded-xl border text-left transition-colors relative',
                        selected
                          ? 'bg-[var(--color-accent)]/5 border-[var(--color-accent)]'
                          : 'bg-[var(--bg-card)]/40 border-[var(--border-default)] hover:border-[var(--border-hover)]'
                      )}
                    >
                      {selected && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="absolute top-4 right-4 w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                      <fw.icon className={cn('w-5 h-5 mb-4 transition-colors', selected ? 'text-[var(--color-accent)]' : 'text-[var(--text-muted)]')} strokeWidth={1.75} />
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1.5">{fw.name}</h3>
                      <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">{t(fw.descKey)}</p>
                      <p className="text-xs text-[var(--text-muted)]">{fw.features.map(k => t(k)).join(' · ')}</p>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-end">
                <button className="btn-primary" onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  {t('continue')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: CATEGORY ───────────────────────────────────── */}
          {step === 2 && (
            <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 text-center">{t('step2Heading')}</h2>
              <p className="text-[var(--text-muted)] text-sm mb-6 text-center">
                {t('step2Subheading')}
              </p>

              {/* Search bar */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="text"
                  className="input pl-9 pr-9 w-full"
                  placeholder={t('searchTemplates')}
                  value={templateSearch}
                  onChange={e => setTemplateSearch(e.target.value)}
                />
                {templateSearch && (
                  <button
                    type="button"
                    aria-label={t('clearSearch')}
                    onClick={() => setTemplateSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search results */}
              {templateSearch.trim() ? (
                searchResults.length > 0 ? (
                  <motion.div
                    className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    {searchResults.map(t => (
                      <motion.button
                        key={t.id}
                        variants={staggerItem}
                        whileHover={cardHover}
                        onClick={() => {
                          setSelectedTemplate(t.id);
                          setSelectedCategory(t.category);
                          applyTemplate(t.id);
                          setStep(4);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={cn(
                          'p-4 rounded-xl border text-left transition-all duration-200 relative group',
                          selectedTemplate === t.id
                            ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] text-[var(--text-primary)] shadow-[0_0_20px_rgba(6,182,212,0.12)]'
                            : 'bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[rgba(6,182,212,0.3)] hover:bg-[var(--bg-card)]'
                        )}
                      >
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 text-base transition-colors', selectedTemplate === t.id ? 'bg-[var(--color-accent)]/20' : 'bg-[var(--bg-hover)] group-hover:bg-[var(--color-accent)]/10')}>
                          {t.icon}
                        </div>
                        <div className="text-sm font-semibold leading-tight mb-1">{t.name}</div>
                        <div className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">{t.description}</div>
                      </motion.button>
                    ))}
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="w-8 h-8 text-[var(--text-muted)] mb-3 opacity-40" />
                    <p className="text-sm text-[var(--text-muted)]">{t('noTemplatesFound', { query: templateSearch })}</p>
                    <button
                      type="button"
                      className="mt-3 text-xs text-[var(--accent-400)] hover:underline"
                      onClick={() => setTemplateSearch('')}
                    >
                      {t('clearSearchLink')}
                    </button>
                  </div>
                )
              ) : templatesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] animate-pulse" />
                  ))}
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {apiCategories.map(cat => {
                    const icon = templates.find(t => t.category === cat)?.icon ?? '🤖';
                    const count = templates.filter(t => t.category === cat).length;
                    const label = cat.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                    const isSelected = selectedCategory === cat && selectedTemplate !== 'custom';
                    return (
                      <motion.button
                        key={cat}
                        variants={staggerItem}
                        whileHover={cardHover}
                        onClick={() => { setSelectedCategory(cat); setSelectedTemplate(''); setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={cn(
                          'p-4 rounded-xl border text-left transition-all duration-200 relative',
                          isSelected
                            ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] shadow-[0_0_20px_rgba(6,182,212,0.12)]'
                            : 'bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[rgba(6,182,212,0.3)] hover:bg-[var(--bg-card)]'
                        )}
                      >
                        {isSelected && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[var(--accent-600)] flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </motion.div>
                        )}
                        <div className="text-2xl mb-2.5 leading-none">{icon}</div>
                        <div className="text-sm font-semibold leading-tight text-[var(--text-primary)] mb-0.5">{label}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{t('categoryCount', { count })}</div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}

              {/* Custom option at bottom */}
              <div className="mt-6 pt-5 border-t border-[var(--border-default)]">
                <motion.button
                  whileHover={cardHover}
                  onClick={() => { setSelectedTemplate('custom'); setSelectedCategory(''); setStep(4); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={cn(
                    'w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-all duration-200',
                    selectedTemplate === 'custom'
                      ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] text-[var(--text-primary)]'
                      : 'bg-[var(--bg-elevated)] border-dashed border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <div className={cn('w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center text-lg', selectedTemplate === 'custom' ? 'bg-[var(--color-accent)]/20' : 'bg-[var(--bg-hover)]')}>
                    ⚙️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{t('customAgent')}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{t('customAgentDesc')}</div>
                  </div>
                  {selectedTemplate === 'custom' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 rounded-full bg-[var(--accent-600)] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              </div>

              <div className="mt-6 flex justify-between">
                <button className="btn-secondary" onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  <ChevronLeft className="w-4 h-4" />
                  {t('back')}
                </button>
                <button
                  className="btn-primary"
                  disabled={!selectedCategory && selectedTemplate !== 'custom'}
                  onClick={() => {
                    if (selectedTemplate === 'custom') {
                      setStep(4);
                    } else {
                      setStep(3);
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  {t('continue')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: TEMPLATE ───────────────────────────────────── */}
          {step === 3 && (
            <motion.div key="step3" variants={stepVariants} initial="enter" animate="center" exit="exit">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1 text-center">
                {selectedCategory.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </h2>
              <p className="text-[var(--text-muted)] text-sm mb-6 text-center">
                {t('step3Subheading')}
              </p>

              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {templates.filter(t => t.category === selectedCategory).map((t) => (
                  <motion.button
                    key={t.id}
                    variants={staggerItem}
                    whileHover={cardHover}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={cn(
                      'p-4 rounded-xl border text-left transition-all duration-200 relative group',
                      selectedTemplate === t.id
                        ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] text-[var(--text-primary)] shadow-[0_0_20px_rgba(6,182,212,0.12)]'
                        : 'bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[rgba(6,182,212,0.3)] hover:bg-[var(--bg-card)]'
                    )}
                  >
                    {selectedTemplate === t.id && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[var(--accent-600)] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 text-base transition-colors', selectedTemplate === t.id ? 'bg-[var(--color-accent)]/20' : 'bg-[var(--bg-hover)] group-hover:bg-[var(--color-accent)]/10')}>
                      {t.icon}
                    </div>
                    <div className="text-sm font-semibold leading-tight mb-1">{t.name}</div>
                    <div className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">{t.description}</div>
                  </motion.button>
                ))}
              </motion.div>

              <div className="mt-6 flex justify-between">
                <button className="btn-secondary" onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  <ChevronLeft className="w-4 h-4" />
                  {t('back')}
                </button>
                <button
                  className="btn-primary"
                  onClick={() => { applyTemplate(); setStep(4); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  {t('continue')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: CONFIGURE ───────────────────────────────────── */}
          {step === 4 && (
            <motion.div
              key="step4"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 text-center">{t('step4Heading')}</h2>
              <p className="text-[var(--text-muted)] text-sm mb-8 text-center">
                {t('step4Subheading')}
              </p>

              <div className={cn(cardClass, 'p-6 sm:p-8 space-y-6')}>
                {/* Agent name */}
                <div>
                  <label htmlFor="agent-name" className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2">
                    <Bot className="w-4 h-4 text-[var(--accent-400)]" aria-hidden="true" />
                    {t('agentNameLabel')} <span className="text-[var(--accent-600)]" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    id="agent-name"
                    type="text"
                    className={cn(
                      'input',
                      openclawForm.name.length > 0 && !nameValid && 'border-[#F87171]/50 focus:border-[#F87171]/70 focus:ring-[#F87171]/20',
                    )}
                    placeholder={t('agentNamePlaceholder')}
                    value={openclawForm.name}
                    onChange={(e) => setOpenclawForm((p) => ({ ...p, name: e.target.value }))}
                    minLength={3}
                    maxLength={50}
                    required
                    aria-required="true"
                    aria-describedby="agent-name-hint"
                    aria-invalid={openclawForm.name.length > 0 && openclawForm.name.trim().length < 3 ? 'true' : undefined}
                    autoComplete="off"
                  />
                  <p id="agent-name-hint" className={cn(
                    'text-xs mt-1.5 ml-1',
                    openclawForm.name.length > 0 && (!nameValid && openclawForm.name.trim().length > 0)
                      ? 'text-[#F87171]'
                      : 'text-[var(--text-muted)]'
                  )}>
                    {openclawForm.name.length > 0 && openclawForm.name.trim().length < 3
                      ? t('agentNameTooShort')
                      : openclawForm.name.trim().length > 0 && !/^[a-zA-Z0-9 \-:'.()&]+$/.test(openclawForm.name.trim())
                        ? t('agentNameInvalidChars')
                        : t('agentNameHintCount', { count: openclawForm.name.trim().length })}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="agent-description" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    {t('descriptionLabel')}
                  </label>
                  <textarea
                    id="agent-description"
                    className="input resize-none"
                    rows={2}
                    placeholder={t('descriptionPlaceholder')}
                    value={openclawForm.description}
                    onChange={(e) => setOpenclawForm((p) => ({ ...p, description: e.target.value }))}
                    maxLength={140}
                    aria-describedby="agent-desc-hint"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p id="agent-desc-hint" className="text-xs text-[var(--text-muted)]">{t('descriptionHint')}</p>
                    <span className="text-xs text-[var(--text-muted)]">{openclawForm.description.length}/140</span>
                  </div>
                </div>

                {/* ── Connect Your Platforms ── */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-[var(--accent-400)]" />
                      {t('platformsHeading')}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {t('platformsSubheading')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PLATFORMS.filter(p => p.frameworks.includes(selectedFramework)).map((platform) => {
                      const isEnabled = !!platformsEnabled[platform.id];
                      const secrets = platformSecrets[platform.id] ?? {};
                      return (
                        <div
                          key={platform.id}
                          className={cn(
                            'rounded-xl border transition-all duration-200 overflow-hidden',
                            isEnabled
                              ? 'bg-[var(--color-accent)]/5 border-[var(--color-accent)]/40 shadow-[0_0_12px_rgba(6,182,212,0.08)]'
                              : 'bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[var(--border-hover)]'
                          )}
                        >
                          {/* Platform header with toggle.
                              Nested <button> (ToggleSwitch) inside <button>
                              breaks hydration per HTML spec, so the outer
                              element is a div with keyboard-friendly click
                              handling; the inner ToggleSwitch keeps its
                              native button semantics for screen readers. */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setPlatformsEnabled(prev => ({ ...prev, [platform.id]: !prev[platform.id] }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setPlatformsEnabled(prev => ({ ...prev, [platform.id]: !prev[platform.id] }));
                              }
                            }}
                            className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 rounded-xl"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xl leading-none shrink-0" aria-hidden="true">{platform.icon}</span>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[var(--text-primary)]">{platform.name}</div>
                                <div className="text-[11px] text-[var(--text-muted)] truncate">{platform.description}</div>
                              </div>
                            </div>
                            <div className="shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                              <ToggleSwitch checked={isEnabled} onChange={(v) => setPlatformsEnabled(prev => ({ ...prev, [platform.id]: v }))} />
                            </div>
                          </div>

                          {/* Expanded credential fields */}
                          <AnimatePresence>
                            {isEnabled && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[var(--border-default)]">
                                  {platform.fields.length > 0 ? (
                                    platform.fields.map((field) => {
                                      const fieldVisKey = `${platform.id}_${field.key}`;
                                      const isVisible = !!platformSecretVisibility[fieldVisKey];
                                      return (
                                        <div key={field.key}>
                                          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                            {field.label}
                                            {field.required && <span className="text-[var(--accent-600)] ml-0.5">*</span>}
                                          </label>
                                          <div className="relative">
                                            <input
                                              type={isVisible ? 'text' : 'password'}
                                              className="input w-full pr-10 text-sm"
                                              placeholder={field.placeholder}
                                              value={secrets[field.key] ?? ''}
                                              onChange={(e) => {
                                                setPlatformSecrets(prev => ({
                                                  ...prev,
                                                  [platform.id]: { ...(prev[platform.id] ?? {}), [field.key]: e.target.value },
                                                }));
                                              }}
                                              autoComplete="off"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => setPlatformSecretVisibility(prev => ({ ...prev, [fieldVisKey]: !prev[fieldVisKey] }))}
                                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
                                              aria-label={isVisible ? t('hideValue') : t('showValue')}
                                            >
                                              {isVisible ? <EyeOff size={14} className="text-[var(--text-muted)]" /> : <Eye size={14} className="text-[var(--text-muted)]" />}
                                            </button>
                                          </div>
                                          {'helper' in field && field.helper && (
                                            <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-relaxed">{field.helper}</p>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    'note' in platform && platform.note && (
                                      <p className="text-xs text-[var(--text-muted)] py-1 flex items-center gap-1.5">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]/60 shrink-0" />
                                        {platform.note}
                                      </p>
                                    )
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)] mt-3 text-center opacity-70">
                    {t('noPlatformsNote')}
                  </p>
                </div>

                {/* LLM Choice */}
                <fieldset>
                  <legend className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                    {t('llmModelLabel')}
                  </legend>
                  <div className="space-y-3" role="radiogroup" aria-label={t('llmModelAria')}>
                    {/* Free Groq */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setLlmChoice('free_groq')}
                      className={cn(
                        'w-full p-4 rounded-xl border text-left transition-all duration-200',
                        llmChoice === 'free_groq'
                          ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] shadow-[0_0_16px_rgba(6,182,212,0.1)]'
                          : 'bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[rgba(6,182,212,0.3)]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                            {t('llmFreeLabel')}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                              {t('llmFreeTag')}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--text-muted)] mt-0.5">{t('llmFreeSubtext')}</div>
                        </div>
                      </div>
                    </motion.button>

                    {/* BYOK */}
                    <div
                      className={cn(
                        'rounded-xl border transition-all duration-200',
                        llmChoice === 'byok'
                          ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] shadow-[0_0_16px_rgba(6,182,212,0.1)]'
                          : 'bg-[var(--bg-elevated)] border-[var(--border-default)]'
                      )}
                    >
                      <button
                        onClick={() => setLlmChoice('byok')}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center">
                            <Key className="w-5 h-5 text-[var(--color-accent)]" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                              {t('llmByokLabel')}
                              <span className="text-[10px] text-green-400">{t('llmByokTag')}</span>
                            </div>
                            <div className="text-xs text-[var(--text-muted)] mt-0.5">{t('llmByokSubtext')}</div>
                          </div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {llmChoice === 'byok' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-4 border-t border-[var(--border-default)] pt-4">
                              {/* Provider */}
                              <div>
                                <label className="block text-xs text-[var(--text-secondary)] mb-2 uppercase tracking-wider">{t('byokProviderLabel')}</label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {BYOK_PROVIDERS.map((p) => (
                                    <motion.button
                                      key={p.key}
                                      type="button"
                                      whileHover={{ scale: 1.04 }}
                                      whileTap={{ scale: 0.97 }}
                                      onClick={() => {
                                        setByokProvider(p.key);
                                        setByokModel('');
                                        setByokCustomModel(false);
                                        if (p.defaultBaseUrl) setByokBaseUrl(p.defaultBaseUrl);
                                        else setByokBaseUrl('');
                                      }}
                                      className={cn(
                                        'text-xs border rounded-lg px-3 py-2 transition-all text-left',
                                        byokProvider === p.key
                                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--text-primary)] shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                                          : 'border-[var(--border-default)] hover:border-[rgba(6,182,212,0.3)] text-[var(--text-secondary)]'
                                      )}
                                    >
                                      <div className="font-medium">{p.name}</div>
                                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight truncate">{p.description}</div>
                                    </motion.button>
                                  ))}
                                </div>
                              </div>

                              {/* Model */}
                              <div>
                                <label htmlFor="byok-model" className="block text-xs text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                                  {t('byokModelLabel')}
                                </label>
                                {byokCustomModel ? (
                                  <div className="space-y-2">
                                    <input
                                      id="byok-model"
                                      type="text"
                                      className="input"
                                      placeholder={t('byokModelPlaceholder')}
                                      value={byokModel}
                                      onChange={(e) => setByokModel(e.target.value)}
                                      maxLength={100}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => { setByokCustomModel(false); setByokModel(''); }}
                                      className="text-[11px] text-[var(--color-accent)] hover:text-[#22d3ee] transition-colors"
                                    >
                                      {t('byokBackToList')}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <select
                                      id="byok-model"
                                      className="input w-full appearance-none pr-8 cursor-pointer"
                                      value={byokModel}
                                      onChange={(e) => {
                                        if (e.target.value === '__custom__') {
                                          setByokCustomModel(true);
                                          setByokModel('');
                                        } else {
                                          setByokModel(e.target.value);
                                        }
                                      }}
                                    >
                                      <option value="" style={{ background: 'var(--bg-base)' }}>{t('byokSelectModel')}</option>
                                      {(getBYOKProvider(byokProvider)?.models ?? []).map((m) => (
                                        <option key={m.id} value={m.id} style={{ background: 'var(--bg-base)' }}>
                                          {m.name}{m.context ? ` (${m.context})` : ''}
                                        </option>
                                      ))}
                                      <option value="__custom__" style={{ background: 'var(--bg-base)' }}>{t('byokCustomModel')}</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                                  </div>
                                )}
                              </div>

                              {/* API Key (conditional on provider metadata) */}
                              {(getBYOKProvider(byokProvider)?.requiresApiKey ?? true) && (
                                <div>
                                  <label htmlFor="byok-api-key" className="block text-xs text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                                    {t('byokApiKeyLabel')} <span className="normal-case text-[var(--text-muted)] ml-1">{t('byokApiKeyEncrypted')}</span>
                                  </label>
                                  <input
                                    id="byok-api-key"
                                    type="password"
                                    className="input"
                                    placeholder="sk-..."
                                    value={byokApiKey}
                                    onChange={(e) => setByokApiKey(e.target.value)}
                                    autoComplete="off"
                                  />
                                </div>
                              )}

                              {/* Base URL (conditional on provider metadata) */}
                              {(getBYOKProvider(byokProvider)?.requiresBaseUrl ?? false) && (
                                <div>
                                  <label htmlFor="byok-base-url" className="block text-xs text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                                    {t('byokBaseUrlLabel')}
                                  </label>
                                  <input
                                    id="byok-base-url"
                                    type="url"
                                    className="input"
                                    placeholder={getBYOKProvider(byokProvider)?.defaultBaseUrl ?? 'http://localhost:11434'}
                                    value={byokBaseUrl}
                                    onChange={(e) => setByokBaseUrl(e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Hatcher Credits option removed — use Groq free or BYOK */}
                  </div>
                </fieldset>

                {/* Agent Skills — OpenClaw only */}
                {selectedFramework === 'openclaw' && (
                  <fieldset>
                    <legend className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      {t('skillsHeading')}
                    </legend>
                    <p className="text-xs text-[var(--text-muted)] mb-4">{t('skillsSubheading')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {([
                        { id: 'web_search', emoji: '\uD83D\uDD0D', nameKey: 'skills.webSearch.name', descKey: 'skills.webSearch.desc' },
                        { id: 'calculator', emoji: '\uD83E\uDDEE', nameKey: 'skills.calculator.name', descKey: 'skills.calculator.desc' },
                        { id: 'weather', emoji: '\uD83C\uDF24\uFE0F', nameKey: 'skills.weather.name', descKey: 'skills.weather.desc' },
                        { id: 'code_interpreter', emoji: '\uD83D\uDCBB', nameKey: 'skills.codeInterpreter.name', descKey: 'skills.codeInterpreter.desc' },
                        { id: 'file_manager', emoji: '\uD83D\uDCC1', nameKey: 'skills.fileManager.name', descKey: 'skills.fileManager.desc' },
                        { id: 'image_gen', emoji: '\uD83C\uDFA8', nameKey: 'skills.imageGen.name', descKey: 'skills.imageGen.desc' },
                      ] as const).map((skill) => {
                        const selected = openclawSkills.includes(skill.id);
                        return (
                          <motion.button
                            key={skill.id}
                            type="button"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => toggleSkill(skill.id)}
                            className={cn(
                              'relative p-4 rounded-xl border text-left transition-all duration-200',
                              selected
                                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] shadow-[0_0_16px_rgba(6,182,212,0.12)]'
                                : 'bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[rgba(6,182,212,0.3)]'
                            )}
                          >
                            {selected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--accent-600)] flex items-center justify-center"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                            <span className="text-xl mb-2 block">{skill.emoji}</span>
                            <div className="text-sm font-medium text-[var(--text-primary)]">{t(skill.nameKey)}</div>
                            <div className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{t(skill.descKey)}</div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                {/* Agent Tools — Hermes only */}
                {selectedFramework === 'hermes' && (
                  <fieldset>
                    <legend className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      {t('toolsHeading')}
                    </legend>
                    <p className="text-xs text-[var(--text-muted)] mb-4">{t('toolsSubheading')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {([
                        { id: 'web_search', emoji: '\uD83D\uDD0D', nameKey: 'tools.webSearch.name', descKey: 'tools.webSearch.desc' },
                        { id: 'calculator', emoji: '\uD83E\uDDEE', nameKey: 'tools.calculator.name', descKey: 'tools.calculator.desc' },
                        { id: 'code_execution', emoji: '\uD83D\uDCBB', nameKey: 'tools.codeExecution.name', descKey: 'tools.codeExecution.desc' },
                        { id: 'file_operations', emoji: '\uD83D\uDCC1', nameKey: 'tools.fileOperations.name', descKey: 'tools.fileOperations.desc' },
                        { id: 'memory', emoji: '\uD83E\uDDE0', nameKey: 'tools.memory.name', descKey: 'tools.memory.desc' },
                        { id: 'summarize', emoji: '\uD83D\uDCDD', nameKey: 'tools.summarize.name', descKey: 'tools.summarize.desc' },
                        { id: 'translate', emoji: '\uD83C\uDF10', nameKey: 'tools.translate.name', descKey: 'tools.translate.desc' },
                        { id: 'weather', emoji: '\uD83C\uDF24\uFE0F', nameKey: 'tools.weather.name', descKey: 'tools.weather.desc' },
                      ] as const).map((tool) => {
                        const selected = hermesTools.includes(tool.id);
                        return (
                          <motion.button
                            key={tool.id}
                            type="button"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => toggleHermesTool(tool.id)}
                            className={cn(
                              'relative p-4 rounded-xl border text-left transition-all duration-200',
                              selected
                                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] shadow-[0_0_16px_rgba(6,182,212,0.12)]'
                                : 'bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[rgba(6,182,212,0.3)]'
                            )}
                          >
                            {selected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--accent-600)] flex items-center justify-center"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                            <span className="text-xl mb-2 block">{tool.emoji}</span>
                            <div className="text-sm font-medium text-[var(--text-primary)]">{t(tool.nameKey)}</div>
                            <div className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{t(tool.descKey)}</div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                {/* Plugins — ElizaOS only */}
                {selectedFramework === 'elizaos' && (
                  <fieldset>
                    <legend className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      {t('pluginsHeading')}
                    </legend>
                    <p className="text-xs text-[var(--text-muted)] mb-4">{t('pluginsSubheading')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {([
                        { id: '@elizaos/plugin-sql', emoji: '\uD83D\uDDC3\uFE0F', nameKey: 'plugins.database.name', descKey: 'plugins.database.desc' },
                        { id: '@elizaos/plugin-image', emoji: '\uD83C\uDFA8', nameKey: 'plugins.imageGen.name', descKey: 'plugins.imageGen.desc' },
                        { id: '@elizaos/plugin-video', emoji: '\uD83C\uDFAC', nameKey: 'plugins.video.name', descKey: 'plugins.video.desc' },
                        { id: '@elizaos/plugin-tts', emoji: '\uD83D\uDD0A', nameKey: 'plugins.tts.name', descKey: 'plugins.tts.desc' },
                        { id: '@elizaos/plugin-node', emoji: '\u2699\uFE0F', nameKey: 'plugins.nodeRuntime.name', descKey: 'plugins.nodeRuntime.desc' },
                        { id: '@elizaos/plugin-bootstrap', emoji: '\uD83D\uDE80', nameKey: 'plugins.bootstrap.name', descKey: 'plugins.bootstrap.desc' },
                      ] as const).map((plugin) => {
                        const selected = elizaPlugins.includes(plugin.id);
                        return (
                          <motion.button
                            key={plugin.id}
                            type="button"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => toggleElizaPlugin(plugin.id)}
                            className={cn(
                              'relative p-4 rounded-xl border text-left transition-all duration-200',
                              selected
                                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] shadow-[0_0_16px_rgba(6,182,212,0.12)]'
                                : 'bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[rgba(6,182,212,0.3)]'
                            )}
                          >
                            {selected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--accent-600)] flex items-center justify-center"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                            <span className="text-xl mb-2 block">{plugin.emoji}</span>
                            <div className="text-sm font-medium text-[var(--text-primary)]">{t(plugin.nameKey)}</div>
                            <div className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{t(plugin.descKey)}</div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                {/* Capabilities — Milady only */}
                {selectedFramework === 'milady' && (
                  <fieldset>
                    <legend className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      {t('capabilitiesHeading')}
                    </legend>
                    <p className="text-xs text-[var(--text-muted)] mb-4">{t('capabilitiesSubheading')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {([
                        { id: 'chat', emoji: '\uD83D\uDCAC', nameKey: 'capabilities.chat.name', descKey: 'capabilities.chat.desc' },
                        { id: 'defi', emoji: '\uD83D\uDCB0', nameKey: 'capabilities.defi.name', descKey: 'capabilities.defi.desc' },
                        { id: 'social', emoji: '\uD83D\uDCF1', nameKey: 'capabilities.social.name', descKey: 'capabilities.social.desc' },
                        { id: 'analysis', emoji: '\uD83D\uDCCA', nameKey: 'capabilities.analysis.name', descKey: 'capabilities.analysis.desc' },
                        { id: 'privacy', emoji: '\uD83D\uDD12', nameKey: 'capabilities.privacy.name', descKey: 'capabilities.privacy.desc' },
                        { id: 'memes', emoji: '\uD83C\uDFAD', nameKey: 'capabilities.memes.name', descKey: 'capabilities.memes.desc' },
                      ] as const).map((cap) => {
                        const selected = miladyCapabilities.includes(cap.id);
                        return (
                          <motion.button
                            key={cap.id}
                            type="button"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => toggleMiladyCapability(cap.id)}
                            className={cn(
                              'relative p-4 rounded-xl border text-left transition-all duration-200',
                              selected
                                ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)] shadow-[0_0_16px_rgba(6,182,212,0.12)]'
                                : 'bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[rgba(6,182,212,0.3)]'
                            )}
                          >
                            {selected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--accent-600)] flex items-center justify-center"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                            <span className="text-xl mb-2 block">{cap.emoji}</span>
                            <div className="text-sm font-medium text-[var(--text-primary)]">{t(cap.nameKey)}</div>
                            <div className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{t(cap.descKey)}</div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                {/* Recommended ClawHub skills from template */}
                {selectedTemplate !== 'custom' && (() => {
                  const tpl = templates.find(t => t.id === selectedTemplate);
                  const recSkills = tpl?.recommendedSkills?.[selectedFramework] ?? [];
                  if (recSkills.length === 0) return null;
                  return (
                    <div className="rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-[var(--color-accent)] flex-shrink-0" />
                        <span className="text-sm font-medium text-[var(--text-primary)]">{t('templateSkillsHeading')}</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mb-3">
                        {t('templateSkillsSubheading')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {recSkills.map(slug => (
                          <span
                            key={slug}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-xs text-[var(--color-accent)] font-medium"
                          >
                            <Check size={10} />
                            {formatSkillName(slug)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Agent personality fields */}
                <OpenClawFields
                  form={openclawForm}
                  setForm={setOpenclawForm}
                  skills={openclawSkills}
                  toggleSkill={toggleSkill}
                  showCustomPrompt={showCustomPrompt}
                  setShowCustomPrompt={setShowCustomPrompt}
                />

                {/* ElizaOS-specific fields */}
                {selectedFramework === 'elizaos' && (
                  <>
                    <div>
                      <label htmlFor="eliza-bio" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        {t('elizaBioLabel')}
                      </label>
                      <p className="text-xs text-[var(--text-muted)] mb-2">{t('elizaBioHint')}</p>
                      <textarea
                        id="eliza-bio"
                        className="input resize-none"
                        rows={4}
                        placeholder={t('elizaBioPlaceholder')}
                        value={elizaBio}
                        onChange={(e) => setElizaBio(e.target.value)}
                        maxLength={2000}
                      />
                    </div>
                    <div>
                      <label htmlFor="eliza-lore" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        {t('elizaLoreLabel')}
                      </label>
                      <p className="text-xs text-[var(--text-muted)] mb-2">{t('elizaLoreHint')}</p>
                      <textarea
                        id="eliza-lore"
                        className="input resize-none"
                        rows={3}
                        placeholder={"Was created to help developers build AI applications\nHas extensive knowledge of blockchain technology\nSpeaks three languages fluently"}
                        value={elizaLore}
                        onChange={(e) => setElizaLore(e.target.value)}
                        maxLength={2000}
                      />
                    </div>
                    <div>
                      <label htmlFor="eliza-style" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        {t('elizaStyleLabel')}
                      </label>
                      <p className="text-xs text-[var(--text-muted)] mb-2">{t('elizaStyleHint')}</p>
                      <textarea
                        id="eliza-style"
                        className="input resize-none"
                        rows={3}
                        placeholder={"Be concise and direct\nUse technical terminology when appropriate\nAlways provide examples"}
                        value={elizaStyle}
                        onChange={(e) => setElizaStyle(e.target.value)}
                        maxLength={1000}
                      />
                    </div>
                    <div>
                      <label htmlFor="eliza-topics" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        {t('elizaTopicsLabel')}
                      </label>
                      <input
                        id="eliza-topics"
                        type="text"
                        className="input"
                        placeholder={t('elizaTopicsPlaceholder')}
                        value={elizaTopics}
                        onChange={(e) => setElizaTopics(e.target.value)}
                        maxLength={500}
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1">{t('elizaTopicsHint')}</p>
                    </div>
                    <div>
                      <label htmlFor="eliza-adjectives" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        {t('elizaAdjectivesLabel')}
                      </label>
                      <input
                        id="eliza-adjectives"
                        type="text"
                        className="input"
                        placeholder={t('elizaAdjectivesPlaceholder')}
                        value={elizaAdjectives}
                        onChange={(e) => setElizaAdjectives(e.target.value)}
                        maxLength={500}
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1">{t('elizaAdjectivesHint')}</p>
                    </div>
                  </>
                )}

                {/* Milady-specific fields */}
                {selectedFramework === 'milady' && (
                  <div>
                    <label htmlFor="milady-personality" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      {t('miladyPersonalityLabel')}
                    </label>
                    <p className="text-xs text-[var(--text-muted)] mb-2">{t('miladyPersonalityHint')}</p>
                    <select
                      id="milady-personality"
                      className="input"
                      value={miladyPersonality}
                      onChange={(e) => setMiladyPersonality(e.target.value as typeof miladyPersonality)}
                    >
                      <option value="helpful">{t('miladyPersonalityHelpful')}</option>
                      <option value="tsundere">{t('miladyPersonalityTsundere')}</option>
                      <option value="unhinged">{t('miladyPersonalityUnhinged')}</option>
                      <option value="custom">{t('miladyPersonalityCustom')}</option>
                    </select>
                  </div>
                )}

                {/* ── More Options (collapsible, framework-specific) ── */}
                <div className="border border-[var(--border-default)] bg-[var(--bg-card)] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowMoreOptions((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(46,43,74,0.2)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-[var(--accent-400)]" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">{t('moreOptionsLabel')}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {selectedFramework === 'openclaw' ? t('moreOptionsHints.openclaw') :
                         selectedFramework === 'hermes' ? t('moreOptionsHints.hermes') :
                         selectedFramework === 'elizaos' ? t('moreOptionsHints.elizaos') :
                         t('moreOptionsHints.milady')}
                      </span>
                    </div>
                    {showMoreOptions
                      ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                      : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    }
                  </button>

                  <AnimatePresence>
                    {showMoreOptions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-5 pt-2 space-y-5 border-t border-[var(--border-default)]">

                          {/* ── OpenClaw options ── */}
                          {selectedFramework === 'openclaw' && (
                            <>
                              {/* Session Scope */}
                              <OptionRow
                                label={t('sessionScopeLabel')}
                                hint={t('sessionScopeHint')}
                              >
                                <OptionSelect
                                  value={sessionScope}
                                  onChange={setSessionScope}
                                  options={[
                                    { value: 'per-peer', label: t('sessionScopePerUser') },
                                    { value: 'global', label: t('sessionScopeGlobal') },
                                  ]}
                                />
                              </OptionRow>

                              {/* Web Search */}
                              <OptionRow
                                label={t('webSearchLabel')}
                                hint={t('webSearchHint')}
                              >
                                <ToggleSwitch checked={enableWebSearch} onChange={setEnableWebSearch} />
                              </OptionRow>

                              {enableWebSearch && (
                                <OptionRow
                                  label={t('searchProviderLabel')}
                                  hint={t('searchProviderHint')}
                                  indent
                                >
                                  <OptionSelect
                                    value={searchProvider}
                                    onChange={setSearchProvider}
                                    options={[
                                      { value: 'brave', label: 'Brave' },
                                      { value: 'gemini', label: 'Gemini' },
                                      { value: 'grok', label: 'Grok' },
                                      { value: 'perplexity', label: 'Perplexity' },
                                    ]}
                                  />
                                </OptionRow>
                              )}

                              {/* TTS */}
                              <OptionRow
                                label={t('ttsLabel')}
                                hint={t('ttsHint')}
                              >
                                <ToggleSwitch checked={enableTTS} onChange={setEnableTTS} />
                              </OptionRow>

                              {enableTTS && (
                                <OptionRow
                                  label={t('ttsProviderLabel')}
                                  hint={t('ttsProviderHint')}
                                  indent
                                >
                                  <OptionSelect
                                    value={ttsProvider}
                                    onChange={setTtsProvider}
                                    options={[
                                      { value: 'elevenlabs', label: 'ElevenLabs' },
                                      { value: 'openai', label: 'OpenAI' },
                                    ]}
                                  />
                                </OptionRow>
                              )}
                            </>
                          )}

                          {/* ── Hermes options ── */}
                          {selectedFramework === 'hermes' && (
                            <>
                              {/* Personality */}
                              <OptionRow
                                label={t('hermesPersonalityLabel')}
                                hint={t('hermesPersonalityHint')}
                              >
                                <OptionSelect
                                  value={hermesPersonality}
                                  onChange={setHermesPersonality}
                                  options={[
                                    { value: 'default', label: t('hermesPersonalityDefault') },
                                    { value: 'helpful', label: t('hermesPersonalityHelpful') },
                                    { value: 'technical', label: t('hermesPersonalityTechnical') },
                                    { value: 'creative', label: t('hermesPersonalityCreative') },
                                    { value: 'concise', label: t('hermesPersonalityConcise') },
                                  ]}
                                />
                              </OptionRow>

                              {/* Memory */}
                              <OptionRow
                                label={t('memoryLabel')}
                                hint={t('memoryHint')}
                              >
                                <ToggleSwitch checked={enableMemory} onChange={setEnableMemory} />
                              </OptionRow>

                              {/* Approval Mode */}
                              <OptionRow
                                label={t('approvalModeLabel')}
                                hint={t('approvalModeHint')}
                              >
                                <OptionSelect
                                  value={approvalMode}
                                  onChange={setApprovalMode}
                                  options={[
                                    { value: 'auto', label: t('approvalModeAuto') },
                                    { value: 'ask', label: t('approvalModeAsk') },
                                    { value: 'manual', label: t('approvalModeManual') },
                                  ]}
                                />
                              </OptionRow>
                            </>
                          )}

                          {/* ── ElizaOS options ── */}
                          {selectedFramework === 'elizaos' && (
                            <>
                              {/* Database */}
                              <OptionRow
                                label={t('databaseLabel')}
                                hint={t('databaseHint')}
                              >
                                <OptionSelect
                                  value={dbBackend}
                                  onChange={setDbBackend}
                                  options={[
                                    { value: 'pglite', label: 'PGLite (default)' },
                                    { value: 'postgresql', label: 'PostgreSQL' },
                                    { value: 'sqlite', label: 'SQLite' },
                                  ]}
                                />
                              </OptionRow>

                              {/* Image Generation */}
                              <OptionRow
                                label={t('imageGenLabel')}
                                hint={t('imageGenHint')}
                              >
                                <ToggleSwitch checked={enableImageGen} onChange={setEnableImageGen} />
                              </OptionRow>

                              {/* Voice */}
                              <OptionRow
                                label={t('voiceLabel')}
                                hint={t('voiceHint')}
                              >
                                <ToggleSwitch checked={enableVoice} onChange={setEnableVoice} />
                              </OptionRow>
                            </>
                          )}

                          {/* ── Milady options ── */}
                          {selectedFramework === 'milady' && (
                            <>
                              {/* Personality (already selected above, show summary) */}
                              <OptionRow
                                label={t('miladyPersonalityLabel')}
                                hint={t('miladyPersonalitySelectedHint')}
                              >
                                <OptionSelect
                                  value={miladyPersonality}
                                  onChange={(v) => setMiladyPersonality(v as typeof miladyPersonality)}
                                  options={[
                                    { value: 'helpful', label: t('hermesPersonalityHelpful') },
                                    { value: 'tsundere', label: 'Tsundere' },
                                    { value: 'unhinged', label: 'Unhinged' },
                                    { value: 'custom', label: t('hermesPersonalityTechnical') },
                                  ]}
                                />
                              </OptionRow>

                              {/* Database */}
                              <OptionRow
                                label={t('databaseLabel')}
                                hint={t('databaseHintMilady')}
                              >
                                <OptionSelect
                                  value={dbBackend}
                                  onChange={setDbBackend}
                                  options={[
                                    { value: 'pglite', label: 'PGLite (default)' },
                                    { value: 'postgresql', label: 'PostgreSQL' },
                                  ]}
                                />
                              </OptionRow>

                              {/* Local-First Mode */}
                              <OptionRow
                                label={t('localFirstLabel')}
                                hint={t('localFirstHint')}
                              >
                                <ToggleSwitch checked={localFirst} onChange={setLocalFirst} />
                              </OptionRow>
                            </>
                          )}

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button className="btn-secondary" onClick={() => {
                  if (selectedTemplate === 'custom') {
                    setStep(2);
                  } else {
                    setStep(3);
                  }
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}>
                  <ChevronLeft className="w-4 h-4" />
                  {t('back')}
                </button>
                <button
                  className="btn-primary"
                  disabled={!isConfigValid}
                  onClick={() => { setStep(5); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  {t('continue')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 5: CONFIRM & LAUNCH ────────────────────────────── */}
          {step === 5 && (
            <motion.div
              key="step5"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 text-center">{t('step5Heading')}</h2>
              <p className="text-[var(--text-muted)] text-sm mb-8 text-center">
                {t('step5Subheading')}
              </p>

              <motion.div
                className={cn(cardClass, 'p-6 sm:p-8 mb-6')}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* Agent header */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[var(--border-default)]">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20" style={{ boxShadow: '0 0 20px rgba(6,182,212,0.15)' }}>
                    <Cpu className="w-7 h-7 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[var(--text-primary)]">{agentName}</div>
                    <div className="text-sm text-[var(--text-muted)]">
                      {selectedFramework === 'openclaw' ? 'OpenClaw' : selectedFramework === 'hermes' ? 'Hermes' : selectedFramework === 'milady' ? 'Milady' : 'ElizaOS'} agent
                      <span className="ml-1.5 text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-default)] align-middle">
                        {t(`summaryFrameworkLabels.${selectedFramework}`)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary details */}
                <div className="space-y-3 text-sm">
                  <SummaryRow label={t('summaryAgentType')} value={selectedFramework === 'openclaw' ? 'OpenClaw' : selectedFramework === 'hermes' ? 'Hermes' : selectedFramework === 'milady' ? 'Milady' : 'ElizaOS'} />
                  <SummaryRow label={t('summaryTemplate')} value={templates.find(tpl => tpl.id === selectedTemplate)?.name ?? t('summaryTemplateCustom')} />
                  <SummaryRow label={t('summaryAiModel')} value={getLLMSummary()} />

                  {agentDesc && <SummaryRow label={t('summaryDescription')} value={agentDesc} />}

                  {(() => {
                    const enabled = Object.entries(platformsEnabled).filter(([, v]) => v).map(([id]) => id);
                    if (enabled.length === 0) return null;
                    const names = enabled.map(id => PLATFORMS.find(p => p.id === id)?.name ?? id).join(', ');
                    return <SummaryRow label={t('summaryPlatforms')} value={names} highlight />;
                  })()}

                  <PersonalitySummary
                    framework={selectedFramework}
                    miladyPersonality={miladyPersonality}
                    hermesPersonality={hermesPersonality}
                    systemPrompt={openclawForm.systemPrompt}
                  />

                  <div className="pt-3 border-t border-[var(--border-default)]">
                    <SummaryRow
                      label={t('summaryCost')}
                      value={
                        llmChoice === 'free_groq' ? t('summaryCostFree') :
                        llmChoice === 'byok' ? t('summaryCostByok') :
                        t('summaryCostFree')
                      }
                      valueClass="text-green-400"
                    />
                  </div>
                </div>
              </motion.div>

              {/* ── Test Chat Preview ─────────────────────────── */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <button
                  type="button"
                  onClick={() => setShowTestChat(!showTestChat)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-xl border transition-all duration-200',
                    showTestChat
                      ? 'bg-[rgba(6,182,212,0.08)] border-[var(--color-accent)]/40 shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                      : 'bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[rgba(6,182,212,0.3)] hover:bg-[var(--bg-elevated)]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{t('testChatLabel')}</span>
                      <p className="text-xs text-[var(--text-muted)]">{t('testChatSubtext')}</p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: showTestChat ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showTestChat && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="overflow-hidden"
                    >
                      <div className={cn(cardClass, 'mt-3 p-0 overflow-hidden')}>
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-card)]">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center">
                              <Bot className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                            </div>
                            <span className="text-xs font-medium text-[var(--text-secondary)]">
                              {t('testChatPreviewLabel')} &mdash; {openclawForm.name || 'Agent'}
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1 ml-8">
                            {t('testChatSimulated')}
                          </p>
                        </div>

                        {/* Messages area */}
                        <div className="h-64 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth" id="test-chat-messages">
                          {testMessages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center py-6">
                              <div className="w-12 h-12 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mb-3">
                                <MessageCircle className="w-6 h-6 text-[var(--text-muted)]" />
                              </div>
                              <p className="text-sm text-[var(--text-muted)]">{t('testChatEmpty')}</p>
                              <p className="text-xs text-[var(--text-muted)] mt-1 opacity-60">{t('testChatEmptyHint')}</p>
                            </div>
                          )}

                          {testMessages.map((msg, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 8, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.25 }}
                              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                            >
                              <div
                                className={cn(
                                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                                  msg.role === 'user'
                                    ? 'bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white rounded-br-md'
                                    : 'bg-[rgba(46,43,74,0.6)] text-[var(--text-secondary)] border border-[var(--border-default)] rounded-bl-md'
                                )}
                              >
                                {msg.role === 'assistant' && (
                                  <span className="block text-[10px] font-semibold text-[var(--color-accent)] mb-1">
                                    {openclawForm.name || 'Agent'}
                                  </span>
                                )}
                                <span className="whitespace-pre-wrap">{msg.content}</span>
                              </div>
                            </motion.div>
                          ))}

                          {testLoading && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex justify-start"
                            >
                              <div className="bg-[rgba(46,43,74,0.6)] border border-[var(--border-default)] rounded-2xl rounded-bl-md px-4 py-3">
                                <span className="block text-[10px] font-semibold text-[var(--color-accent)] mb-1">
                                  {openclawForm.name || 'Agent'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* Input area */}
                        <div className="px-4 py-3 border-t border-[var(--border-default)] bg-[var(--bg-card)]">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleTestChat();
                              // Scroll to bottom after sending
                              setTimeout(() => {
                                const el = document.getElementById('test-chat-messages');
                                if (el) el.scrollTop = el.scrollHeight;
                              }, 100);
                            }}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="text"
                              value={testInput}
                              onChange={(e) => setTestInput(e.target.value)}
                              placeholder={t('testChatPlaceholder')}
                              disabled={testLoading}
                              className="flex-1 bg-[var(--bg-hover)] border border-[rgba(46,43,74,0.5)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50 focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all disabled:opacity-50"
                            />
                            <motion.button
                              type="submit"
                              disabled={!testInput.trim() || testLoading}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                                testInput.trim() && !testLoading
                                  ? 'bg-[var(--color-accent)] text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                                  : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                              )}
                            >
                              <Send className="w-4 h-4" />
                            </motion.button>
                          </form>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {launched && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(cardClass, 'p-6 mb-5 text-center border-green-500/30')}
                >
                  <Rocket className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{t('launchedHeading')}</h3>
                  <p className="text-[var(--text-muted)] text-sm">{t('launchedSubtext')}</p>
                </motion.div>
              )}

              <div className="flex justify-between items-center">
                <button
                  className="btn-secondary"
                  onClick={() => { setStep(4); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={launching || launched}
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t('back')}
                </button>
                <motion.button
                  className={cn(
                    'btn-primary px-8 sm:px-10 py-3.5 sm:py-4 text-base font-bold relative overflow-hidden',
                    !launching && !launched && 'hatch-glow'
                  )}
                  onClick={handleLaunch}
                  disabled={launching || launched}
                  aria-label={launching ? t('launchCtaCreating') : launched ? t('launchCtaCreated') : t('launchCtaLabel')}
                  whileHover={!launching && !launched ? { scale: 1.03 } : {}}
                  whileTap={!launching && !launched ? { scale: 0.98 } : {}}
                  animate={launching ? {
                    rotate: [0, -3, 3, -2, 2, -1, 1, 0],
                    transition: { duration: 0.5, ease: 'easeInOut' },
                  } : !launching && !launched ? {
                    boxShadow: [
                      '0 0 0 0 rgba(6, 182, 212, 0)',
                      '0 0 20px 6px rgba(6, 182, 212, 0.3)',
                      '0 0 0 0 rgba(6, 182, 212, 0)',
                    ],
                  } : {}}
                  transition={!launching && !launched ? {
                    boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                  } : {}}
                >
                  {launching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('launching')}
                    </>
                  ) : launched ? (
                    <>
                      <Check className="w-5 h-5" />
                      {t('launched')}
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5" />
                      {t('launchCta')}
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── System Prompt Section ────────────────────────────────────

function SystemPromptSection({
  form,
  update,
  showCustom,
  setShowCustom,
  inputClass,
}: {
  form: { systemPrompt: string };
  update: (key: string, value: string) => void;
  showCustom: boolean;
  setShowCustom: (v: boolean) => void;
  inputClass: string;
}) {
  const t = useTranslations('create');
  return (
    <div className="border border-[var(--border-default)] bg-[var(--bg-card)] rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{t('systemPromptLabel')}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {showCustom
              ? t('systemPromptCustomNote')
              : t('systemPromptDefaultNote')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showCustom && !form.systemPrompt.trim()) {
              setShowCustom(false);
            } else if (showCustom) {
              // Confirm clearing custom prompt
              update('systemPrompt', '');
              setShowCustom(false);
            } else {
              setShowCustom(true);
            }
          }}
          className="text-xs font-medium text-[var(--color-accent)] hover:text-[#22d3ee] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-accent)]/10"
        >
          {showCustom ? t('systemPromptUseDefault') : t('systemPromptCustomize')}
        </button>
      </div>

      {showCustom && (
        <div className="mt-3">
          <textarea
            id="system-prompt"
            className={cn(inputClass, 'resize-y min-h-[120px]')}
            rows={8}
            placeholder={t('systemPromptPlaceholder')}
            value={form.systemPrompt}
            onChange={(e) => update('systemPrompt', e.target.value)}
            maxLength={8000}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-[var(--text-muted)]">
              {t('systemPromptHint')}
            </p>
            <span className="text-xs text-[var(--text-muted)]">{t('systemPromptCount', { count: form.systemPrompt.length })}</span>
          </div>
          {form.systemPrompt.trim().length === 0 && (
            <p className="text-xs text-[#FBBF24] mt-2 ml-1">
              {t('systemPromptWarning')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Personality Summary ───────────────────────────────────────

function PersonalitySummary({ framework, miladyPersonality, hermesPersonality, systemPrompt }: {
  framework: string;
  miladyPersonality: string;
  hermesPersonality: string;
  systemPrompt: string;
}) {
  const t = useTranslations('create');
  const isMiladyCustom = framework === 'milady' && miladyPersonality !== 'helpful';
  const isHermesCustom = framework === 'hermes' && hermesPersonality !== 'default';
  const hasCustomPrompt = systemPrompt.trim();
  let label = t('summaryPersonalityDefault');
  if (isMiladyCustom) label = miladyPersonality.charAt(0).toUpperCase() + miladyPersonality.slice(1);
  else if (isHermesCustom) label = hermesPersonality.charAt(0).toUpperCase() + hermesPersonality.slice(1);
  else if (hasCustomPrompt) label = t('summaryPersonalityCustom');
  return <SummaryRow label={t('summaryPersonality')} value={label} highlight={!!hasCustomPrompt || isMiladyCustom || isHermesCustom} />;
}

// ── Summary Row ─────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  highlight,
  valueClass,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className={cn(
        'text-right',
        valueClass ?? (highlight ? 'text-[var(--color-accent)]' : 'text-[var(--text-secondary)]')
      )}>
        {value}
      </span>
    </div>
  );
}

// ── Agent Personality Fields ─────────────────────────────────

function OpenClawFields({
  form,
  setForm,
  skills,
  toggleSkill,
  showCustomPrompt,
  setShowCustomPrompt,
}: {
  form: { name: string; description: string; systemPrompt: string };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  skills: string[];
  toggleSkill: (skill: string) => void;
  showCustomPrompt: boolean;
  setShowCustomPrompt: (v: boolean) => void;
}) {
  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));
  const inputClass = 'input';

  return (
    <>
      {/* System Prompt */}
      <SystemPromptSection
        form={form}
        update={update}
        showCustom={showCustomPrompt}
        setShowCustom={setShowCustomPrompt}
        inputClass={inputClass}
      />

    </>
  );
}

// ── Toggle Switch ───────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0B1A]',
        checked ? 'bg-[var(--color-accent)]' : 'bg-[rgba(46,43,74,0.8)]'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

// ── Option Select Dropdown ──────────────────────────────────

function OptionSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        className="input w-full appearance-none pr-8 cursor-pointer text-sm py-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: 'var(--bg-base)' }}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
    </div>
  );
}

// ── Option Row ──────────────────────────────────────────────

function OptionRow({
  label,
  hint,
  indent,
  children,
}: {
  label: string;
  hint: string;
  indent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-4',
      indent && 'ml-6 pl-3 border-l-2 border-[rgba(6,182,212,0.2)]'
    )}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{hint}</p>
      </div>
      <div className="shrink-0 w-40">
        {children}
      </div>
    </div>
  );
}
