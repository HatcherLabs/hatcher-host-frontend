'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import { BYOK_PROVIDERS, getBYOKProvider, AGENT_TEMPLATES } from '@hatcher/shared';
import type { BYOKProvider, AgentTemplateId } from '@hatcher/shared';
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
  Send,
  Settings2,
  Gem,
  Zap,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: 'Pick a style',
  2: 'Choose a template',
  3: 'Set it up',
  4: 'Ready to hatch?',
};

type LLMChoice = 'free_groq' | 'byok';

// BYOK_PROVIDERS imported from @hatcher/shared

// ── Templates (derived from shared AGENT_TEMPLATES) ─────────

const CATEGORY_ORDER = ['business', 'development', 'crypto', 'research', 'support', 'custom'] as const;

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
      { key: 'DISCORD_BOT_TOKEN', label: 'Bot Token', placeholder: 'Discord bot token', helper: 'Discord Developer Portal \u2192 New Application \u2192 Bot \u2192 Copy Token', required: true },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '\uD83D\uDCAC',
    description: 'Connect via QR code',
    frameworks: ['openclaw', 'hermes', 'milady'],
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

  // ── Template state (pre-select via ?template= URL param) ──
  const searchParams = useSearchParams();
  const preselectedTemplate = searchParams.get('template') ?? 'custom';
  const validPreselect = AGENT_TEMPLATES.some(t => t.id === preselectedTemplate) ? preselectedTemplate : 'custom';
  const [selectedTemplate, setSelectedTemplate] = useState(validPreselect);
  const [selectedFramework, setSelectedFramework] = useState<'openclaw' | 'hermes' | 'elizaos' | 'milady'>('openclaw');

  // ── OpenClaw form state ──
  const [openclawForm, setOpenclawForm] = useState({
    name: '',
    description: '',
    systemPrompt: '',  // custom override only — blank means "use template default"
  });
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [openclawSkills, setOpenclawSkills] = useState<string[]>([...OPENCLAW_SKILLS_LIST]);

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

  /** Pre-populate form fields from the selected template when moving to step 2 */
  function applyTemplate() {
    if (selectedTemplate === 'custom') return;
    const tpl = AGENT_TEMPLATES.find((t) => t.id === selectedTemplate);
    if (!tpl) return;

    const updates: Partial<typeof openclawForm> = {};

    // Only pre-fill empty fields (don't overwrite user edits)
    if (!openclawForm.name.trim()) {
      updates.name = tpl.name;
    }
    if (!openclawForm.description.trim()) {
      updates.description = tpl.description;
    }
    // System prompt is NOT pre-filled — it uses the template default server-side
    // User only fills systemPrompt if they want to override

    if (Object.keys(updates).length > 0) {
      setOpenclawForm((prev) => ({ ...prev, ...updates }));
    }
  }

  function toggleSkill(skill: string) {
    setOpenclawSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
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
    if (llmChoice === 'free_groq') return 'Free AI Model (Groq)';
    const prov = getBYOKProvider(byokProvider);
    return `Your key: ${prov?.name ?? byokProvider}${byokModel ? ` / ${byokModel}` : ''}`;
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

      const filteredPlatformSecrets = Object.fromEntries(
        Object.entries(platformSecrets).filter(([key]) => platformsEnabled[key])
      );

      const payload: Parameters<typeof api.createAgent>[0] = {
        name: openclawForm.name,
        ...(openclawForm.description.trim() ? { description: openclawForm.description.trim() } : {}),
        framework: selectedFramework,
        template: selectedTemplate as AgentTemplateId,
        config: {
          model: llm.model ?? 'llama-4-scout-17b',
          provider: llm.modelProvider,
          ...(selectedFramework === 'openclaw' ? { skills: openclawSkills } : {}),
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
          systemPrompt: openclawForm.systemPrompt.trim()
            ? openclawForm.systemPrompt
            : (AGENT_TEMPLATES.find(t => t.id === selectedTemplate)?.defaultSystemPrompt ?? ''),
          // BYOK config -- backend reads agentConfig['byok']
          ...(llm.byok ? { byok: llm.byok } : {}),
          // Platform integrations
          ...(enabledPlatforms.length > 0 ? {
            platforms: enabledPlatforms,
            platformSecrets: filteredPlatformSecrets,
          } : {}),
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
        colors: ['#06b6d4', '#06b6d4', '#fed7aa', '#FFFFFF'],
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
          <Loader2 className="w-10 h-10 text-[#06b6d4] animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)] text-sm">Authenticating...</p>
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
          <div className="w-16 h-16 rounded-2xl bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center mx-auto mb-6">
            <Key className="w-8 h-8 text-[#06b6d4]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-3">Sign In Required</h1>
          <p className="text-[var(--text-secondary)] text-sm mb-8">Sign in to your account to create agents.</p>
          <a href="/login" className="btn-primary inline-block">
            Sign In
          </a>
        </div>
      </motion.div>
    );
  }

  // ── Validation ──

  const selectedByokProvider = getBYOKProvider(byokProvider);
  const nameValid = openclawForm.name.trim().length >= 3 && /^[a-zA-Z0-9 \-]+$/.test(openclawForm.name.trim());
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
        {/* Page title with robot guide */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center">
              <Bot size={20} className="text-[#06b6d4]" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>Create Your Agent</h1>
              <p className="text-[var(--text-muted)] text-sm">Launch a free AI agent in under 2 minutes</p>
            </div>
          </div>
        </motion.div>

        {/* ── STEP INDICATOR ─────────────────────────────────────── */}
        <div className="mb-12">
          {/* Progress bar */}
          <div className="max-w-md mx-auto mb-8 px-4">
            <div className="h-1 rounded-full bg-[var(--border-default)] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #22d3ee, #06b6d4, #0891b2)' }}
                initial={{ width: '0%' }}
                animate={{ width: step === 1 ? '10%' : step === 2 ? '33%' : step === 3 ? '66%' : '100%' }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
          </div>
          <div className="flex items-center justify-center gap-0" role="list" aria-label="Creation steps">
            {([1, 2, 3, 4] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center" role="listitem" aria-current={s === step ? 'step' : undefined}>
                {/* Step circle */}
                <div className="flex flex-col items-center gap-2">
                  <motion.div
                    className={cn(
                      'w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2',
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
                      'text-xs max-w-[120px] text-center font-medium',
                      s < step ? 'text-[var(--accent-400)]' : s === step ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                    )}
                  >
                    {STEP_LABELS[s]}
                  </span>
                </div>
                {/* Connecting line */}
                {i < 3 && (
                  <div className="relative w-20 sm:w-32 mx-3 mb-6">
                    <div className="h-0.5 rounded-full bg-[var(--border-default)]" />
                    <motion.div
                      className="absolute top-0 left-0 h-0.5 rounded-full"
                      style={{ background: 'linear-gradient(90deg, #06b6d4, #0891b2)' }}
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
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 text-center">What kind of agent do you want?</h2>
              <p className="text-[var(--text-muted)] text-sm mb-8 text-center">
                Each style has different strengths -- pick the one that fits your needs
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {/* OpenClaw */}
                <motion.button
                  whileHover={cardHover}
                  onClick={() => setSelectedFramework('openclaw')}
                  className={cn(
                    'p-6 rounded-xl border text-left transition-all duration-200 relative',
                    selectedFramework === 'openclaw'
                      ? 'bg-[#06b6d4]/10 border-[#06b6d4] shadow-[0_0_24px_rgba(6,182,212,0.15)]'
                      : 'bg-[rgba(26,23,48,0.6)] border-[rgba(46,43,74,0.4)] hover:border-[rgba(6,182,212,0.4)]'
                  )}
                >
                  {selectedFramework === 'openclaw' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[var(--accent-600)] flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-[#06b6d4]/10 flex items-center justify-center mb-4">
                    <Cpu className="w-6 h-6 text-[#06b6d4]" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">OpenClaw</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-3">
                    Versatile AI assistant with thousands of community skills and multi-channel messaging.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Thousands of skills', 'Web browsing', 'Scheduled tasks'].map(f => (
                      <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(46,43,74,0.6)] text-[var(--text-muted)]">{f}</span>
                    ))}
                  </div>
                </motion.button>

                {/* Hermes */}
                <motion.button
                  whileHover={cardHover}
                  onClick={() => setSelectedFramework('hermes')}
                  className={cn(
                    'p-6 rounded-xl border text-left transition-all duration-200 relative',
                    selectedFramework === 'hermes'
                      ? 'bg-[#06b6d4]/10 border-[#06b6d4] shadow-[0_0_24px_rgba(6,182,212,0.15)]'
                      : 'bg-[rgba(26,23,48,0.6)] border-[rgba(46,43,74,0.4)] hover:border-[rgba(6,182,212,0.4)]'
                  )}
                >
                  {selectedFramework === 'hermes' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[var(--accent-600)] flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Hermes</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-3">
                    Smart AI agent that remembers context across conversations and learns over time.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Long-term memory', '40+ built-in tools', 'Self-improving'].map(f => (
                      <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(46,43,74,0.6)] text-[var(--text-muted)]">{f}</span>
                    ))}
                  </div>
                </motion.button>

                {/* ElizaOS */}
                <motion.button
                  whileHover={cardHover}
                  onClick={() => setSelectedFramework('elizaos')}
                  className={cn(
                    'p-6 rounded-xl border text-left transition-all duration-200 relative',
                    selectedFramework === 'elizaos'
                      ? 'bg-[#06b6d4]/10 border-[#06b6d4] shadow-[0_0_24px_rgba(6,182,212,0.15)]'
                      : 'bg-[rgba(26,23,48,0.6)] border-[rgba(46,43,74,0.4)] hover:border-[rgba(6,182,212,0.4)]'
                  )}
                >
                  {selectedFramework === 'elizaos' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[var(--accent-600)] flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                    <Bot className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">ElizaOS</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-3">
                    Open-source multi-agent framework by ai16z. 90+ plugins, persistent memory, Web3 native.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['90+ plugins', 'Vector memory', 'Web3 native'].map(f => (
                      <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(46,43,74,0.6)] text-[var(--text-muted)]">{f}</span>
                    ))}
                  </div>
                </motion.button>

                {/* Milady */}
                <motion.button
                  whileHover={cardHover}
                  onClick={() => setSelectedFramework('milady')}
                  className={cn(
                    'p-6 rounded-xl border text-left transition-all duration-200 relative',
                    selectedFramework === 'milady'
                      ? 'bg-[#f43f5e]/10 border-[#f43f5e] shadow-[0_0_24px_rgba(244,63,94,0.15)]'
                      : 'bg-[rgba(26,23,48,0.6)] border-[rgba(46,43,74,0.4)] hover:border-[rgba(244,63,94,0.4)]'
                  )}
                >
                  {selectedFramework === 'milady' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[var(--accent-600)] flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center mb-4">
                    <Gem className="w-6 h-6 text-rose-400" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Milady</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-3">
                    Privacy-first AI runtime with 20+ connectors, VRM avatars, and DeFi integration.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['20+ connectors', 'Personality presets', 'Privacy-first'].map(f => (
                      <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(46,43,74,0.6)] text-[var(--text-muted)]">{f}</span>
                    ))}
                  </div>
                </motion.button>
              </div>

              <div className="mt-8 flex justify-end">
                <button className="btn-primary" onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: TEMPLATE ───────────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 text-center">Choose a template</h2>
              <p className="text-[var(--text-muted)] text-sm mb-2 text-center">
                Pick a starting point for your agent
              </p>
              <p className="text-xs text-[var(--text-muted)] mb-8 text-center opacity-60">Templates give your agent a head start -- you can customize everything later</p>

              <motion.div
                className="space-y-6"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {CATEGORY_ORDER.map((cat) => {
                  const templates = AGENT_TEMPLATES.filter((t) => t.category === cat);
                  if (templates.length === 0) return null;
                  const catLabel = cat === 'business' ? 'Business & Marketing'
                    : cat === 'development' ? 'Development & Technical'
                    : cat === 'crypto' ? 'Crypto & Finance'
                    : cat === 'research' ? 'Research & Knowledge'
                    : cat === 'support' ? 'Support & Operations'
                    : 'Custom';
                  return (
                    <div key={cat}>
                      <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">{catLabel}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {templates.map((t) => (
                          <motion.button
                            key={t.id}
                            variants={staggerItem}
                            whileHover={cardHover}
                            onClick={() => setSelectedTemplate(t.id)}
                            className={cn(
                              'p-4 rounded-xl border text-left transition-all duration-200 relative group',
                              selectedTemplate === t.id
                                ? 'bg-[#06b6d4]/10 border-[#06b6d4] text-[#FFFFFF] shadow-[0_0_24px_rgba(6,182,212,0.15)]'
                                : 'bg-[rgba(26,23,48,0.6)] border-[rgba(46,43,74,0.4)] text-[#A5A1C2] hover:border-[rgba(6,182,212,0.4)] hover:shadow-[0_0_16px_rgba(6,182,212,0.08)]'
                            )}
                          >
                            {selectedTemplate === t.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--accent-600)] flex items-center justify-center"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                            <div className={cn(
                              'w-9 h-9 rounded-lg flex items-center justify-center mb-2 text-lg transition-colors duration-200',
                              selectedTemplate === t.id
                                ? 'bg-[#06b6d4]/20'
                                : 'bg-[rgba(46,43,74,0.4)] group-hover:bg-[#06b6d4]/10'
                            )}>
                              {t.icon}
                            </div>
                            <div className="text-sm font-medium">{t.name}</div>
                            <div className="text-xs text-[#71717a] mt-1">{t.description}</div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              <div className="mt-8 flex justify-end">
                <button className="btn-primary" onClick={() => { applyTemplate(); setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: CONFIGURE ───────────────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 text-center">Personalize your agent</h2>
              <p className="text-[var(--text-muted)] text-sm mb-8 text-center">
                Give your agent a name and choose how it thinks
              </p>

              <div className={cn(cardClass, 'p-6 sm:p-8 space-y-6')}>
                {/* Agent name */}
                <div>
                  <label htmlFor="agent-name" className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2">
                    <Bot className="w-4 h-4 text-[var(--accent-400)]" aria-hidden="true" />
                    Agent Name <span className="text-[var(--accent-600)]" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    id="agent-name"
                    type="text"
                    className={cn(
                      'input',
                      openclawForm.name.length > 0 && !nameValid && 'border-[#F87171]/50 focus:border-[#F87171]/70 focus:ring-[#F87171]/20',
                    )}
                    placeholder="e.g. AlphaResearcher, TweetLord..."
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
                      ? 'Name must be at least 3 characters'
                      : openclawForm.name.trim().length > 0 && !/^[a-zA-Z0-9 \-]+$/.test(openclawForm.name.trim())
                        ? 'Only letters, numbers, spaces, and hyphens allowed'
                        : `${openclawForm.name.trim().length}/50 characters`}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="agent-description" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Description
                  </label>
                  <textarea
                    id="agent-description"
                    className="input resize-none"
                    rows={2}
                    placeholder="Brief description of what your agent does..."
                    value={openclawForm.description}
                    onChange={(e) => setOpenclawForm((p) => ({ ...p, description: e.target.value }))}
                    maxLength={140}
                    aria-describedby="agent-desc-hint"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p id="agent-desc-hint" className="text-xs text-[var(--text-muted)]">Brief tagline for your agent</p>
                    <span className="text-xs text-[var(--text-muted)]">{openclawForm.description.length}/140</span>
                  </div>
                </div>

                {/* ── Connect Your Platforms ── */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-[var(--accent-400)]" />
                      Where should your agent live?
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Select platforms and add your API keys. You can add more later in Settings.
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
                              ? 'bg-[#06b6d4]/5 border-[#06b6d4]/40 shadow-[0_0_12px_rgba(6,182,212,0.08)]'
                              : 'bg-[rgba(26,23,48,0.6)] border-[rgba(46,43,74,0.4)] hover:border-[rgba(46,43,74,0.7)]'
                          )}
                        >
                          {/* Platform header with toggle */}
                          <button
                            type="button"
                            onClick={() => setPlatformsEnabled(prev => ({ ...prev, [platform.id]: !prev[platform.id] }))}
                            className="w-full flex items-center justify-between px-4 py-3 text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xl leading-none shrink-0" aria-hidden="true">{platform.icon}</span>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[var(--text-primary)]">{platform.name}</div>
                                <div className="text-[11px] text-[var(--text-muted)] truncate">{platform.description}</div>
                              </div>
                            </div>
                            <div className="shrink-0 ml-3">
                              <ToggleSwitch checked={isEnabled} onChange={(v) => setPlatformsEnabled(prev => ({ ...prev, [platform.id]: v }))} />
                            </div>
                          </button>

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
                                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[rgba(46,43,74,0.3)]">
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
                                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[rgba(46,43,74,0.4)] transition-colors"
                                              aria-label={isVisible ? 'Hide value' : 'Show value'}
                                            >
                                              {isVisible ? <EyeOff size={14} className="text-[#71717a]" /> : <Eye size={14} className="text-[#71717a]" />}
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
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#06b6d4]/60 shrink-0" />
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
                    No platforms selected? No problem -- add them anytime from your agent&apos;s Settings tab.
                  </p>
                </div>

                {/* LLM Choice */}
                <fieldset>
                  <legend className="block text-sm font-medium text-[#FFFFFF] mb-3">
                    AI Model
                  </legend>
                  <div className="space-y-3" role="radiogroup" aria-label="AI Model selection">
                    {/* Free Groq */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setLlmChoice('free_groq')}
                      className={cn(
                        'w-full p-4 rounded-xl border text-left transition-all duration-200',
                        llmChoice === 'free_groq'
                          ? 'bg-[#06b6d4]/10 border-[#06b6d4] shadow-[0_0_16px_rgba(6,182,212,0.1)]'
                          : 'bg-[rgba(26,23,48,0.6)] border-[rgba(46,43,74,0.4)] hover:border-[rgba(6,182,212,0.3)]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#FFFFFF] flex items-center gap-2">
                            Free AI Model
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                              FREE
                            </span>
                          </div>
                          <div className="text-xs text-[#71717a] mt-0.5">Powered by Groq — no API key needed</div>
                        </div>
                      </div>
                    </motion.button>

                    {/* BYOK */}
                    <div
                      className={cn(
                        'rounded-xl border transition-all duration-200',
                        llmChoice === 'byok'
                          ? 'bg-[#06b6d4]/10 border-[#06b6d4] shadow-[0_0_16px_rgba(6,182,212,0.1)]'
                          : 'bg-[rgba(26,23,48,0.6)] border-[rgba(46,43,74,0.4)]'
                      )}
                    >
                      <button
                        onClick={() => setLlmChoice('byok')}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#06b6d4]/10 flex items-center justify-center">
                            <Key className="w-5 h-5 text-[#06b6d4]" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#FFFFFF] flex items-center gap-2">
                              Use Your Own AI Key
                              <span className="text-[10px] text-green-400">always free</span>
                            </div>
                            <div className="text-xs text-[#71717a] mt-0.5">Connect your own OpenAI, Anthropic, or other API key</div>
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
                            <div className="px-4 pb-4 space-y-4 border-t border-[rgba(46,43,74,0.3)] pt-4">
                              {/* Provider */}
                              <div>
                                <label className="block text-xs text-[#A5A1C2] mb-2 uppercase tracking-wider">Provider</label>
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
                                          ? 'border-[#06b6d4] bg-[#06b6d4]/10 text-[#FFFFFF] shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                                          : 'border-[rgba(46,43,74,0.4)] hover:border-[rgba(6,182,212,0.3)] text-[#A5A1C2]'
                                      )}
                                    >
                                      <div className="font-medium">{p.name}</div>
                                      <div className="text-[10px] text-[#71717a] mt-0.5 leading-tight truncate">{p.description}</div>
                                    </motion.button>
                                  ))}
                                </div>
                              </div>

                              {/* Model */}
                              <div>
                                <label htmlFor="byok-model" className="block text-xs text-[#A5A1C2] mb-2 uppercase tracking-wider">
                                  Model
                                </label>
                                {byokCustomModel ? (
                                  <div className="space-y-2">
                                    <input
                                      id="byok-model"
                                      type="text"
                                      className="input"
                                      placeholder="model identifier..."
                                      value={byokModel}
                                      onChange={(e) => setByokModel(e.target.value)}
                                      maxLength={100}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => { setByokCustomModel(false); setByokModel(''); }}
                                      className="text-[11px] text-[#06b6d4] hover:text-[#22d3ee] transition-colors"
                                    >
                                      Back to model list
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
                                      <option value="" style={{ background: '#0D0B1A' }}>Select a model...</option>
                                      {(getBYOKProvider(byokProvider)?.models ?? []).map((m) => (
                                        <option key={m.id} value={m.id} style={{ background: '#0D0B1A' }}>
                                          {m.name}{m.context ? ` (${m.context})` : ''}
                                        </option>
                                      ))}
                                      <option value="__custom__" style={{ background: '#0D0B1A' }}>Custom model...</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
                                  </div>
                                )}
                              </div>

                              {/* API Key (conditional on provider metadata) */}
                              {(getBYOKProvider(byokProvider)?.requiresApiKey ?? true) && (
                                <div>
                                  <label htmlFor="byok-api-key" className="block text-xs text-[#A5A1C2] mb-2 uppercase tracking-wider">
                                    API Key <span className="normal-case text-[#71717a] ml-1">encrypted at rest</span>
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
                                  <label htmlFor="byok-base-url" className="block text-xs text-[#A5A1C2] mb-2 uppercase tracking-wider">
                                    Base URL
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
                        Bio
                      </label>
                      <p className="text-xs text-[var(--text-muted)] mb-2">Define your agent&apos;s personality and background. One statement per line.</p>
                      <textarea
                        id="eliza-bio"
                        className="input resize-none"
                        rows={4}
                        placeholder="A knowledgeable AI assistant specializing in..."
                        value={elizaBio}
                        onChange={(e) => setElizaBio(e.target.value)}
                        maxLength={2000}
                      />
                    </div>
                    <div>
                      <label htmlFor="eliza-lore" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Lore
                      </label>
                      <p className="text-xs text-[var(--text-muted)] mb-2">Background knowledge and history for your agent. One fact per line.</p>
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
                        Style Instructions
                      </label>
                      <p className="text-xs text-[var(--text-muted)] mb-2">How your agent should communicate. One instruction per line.</p>
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
                        Topics
                      </label>
                      <input
                        id="eliza-topics"
                        type="text"
                        className="input"
                        placeholder="technology, AI, crypto, research"
                        value={elizaTopics}
                        onChange={(e) => setElizaTopics(e.target.value)}
                        maxLength={500}
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1">Comma-separated topics your agent knows about</p>
                    </div>
                    <div>
                      <label htmlFor="eliza-adjectives" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Adjectives
                      </label>
                      <input
                        id="eliza-adjectives"
                        type="text"
                        className="input"
                        placeholder="helpful, analytical, concise"
                        value={elizaAdjectives}
                        onChange={(e) => setElizaAdjectives(e.target.value)}
                        maxLength={500}
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1">Personality traits, comma-separated</p>
                    </div>
                  </>
                )}

                {/* Milady-specific fields */}
                {selectedFramework === 'milady' && (
                  <div>
                    <label htmlFor="milady-personality" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Personality Preset
                    </label>
                    <p className="text-xs text-[var(--text-muted)] mb-2">Choose a personality vibe for your Milady agent.</p>
                    <select
                      id="milady-personality"
                      className="input"
                      value={miladyPersonality}
                      onChange={(e) => setMiladyPersonality(e.target.value as typeof miladyPersonality)}
                    >
                      <option value="helpful">Helpful - Friendly and professional</option>
                      <option value="tsundere">Tsundere - Reluctant but secretly caring</option>
                      <option value="unhinged">Unhinged - Chaotic and unpredictable</option>
                      <option value="custom">Custom - Uses your system prompt</option>
                    </select>
                  </div>
                )}

                {/* ── More Options (collapsible, framework-specific) ── */}
                <div className="border border-[rgba(46,43,74,0.3)] bg-[rgba(26,23,48,0.4)] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowMoreOptions((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(46,43,74,0.2)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-[var(--accent-400)]" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">More Options</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {selectedFramework === 'openclaw' ? 'Search, voice, sessions' :
                         selectedFramework === 'hermes' ? 'Personality, memory, approvals' :
                         selectedFramework === 'elizaos' ? 'Database, image gen, voice' :
                         'Database, privacy, presets'}
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
                        <div className="px-4 pb-5 pt-2 space-y-5 border-t border-[rgba(46,43,74,0.3)]">

                          {/* ── OpenClaw options ── */}
                          {selectedFramework === 'openclaw' && (
                            <>
                              {/* Session Scope */}
                              <OptionRow
                                label="Session Scope"
                                hint="How conversation context is shared between users"
                              >
                                <OptionSelect
                                  value={sessionScope}
                                  onChange={setSessionScope}
                                  options={[
                                    { value: 'per-peer', label: 'Per User' },
                                    { value: 'global', label: 'Global' },
                                  ]}
                                />
                              </OptionRow>

                              {/* Web Search */}
                              <OptionRow
                                label="Enable Web Search"
                                hint="Allow your agent to search the web for real-time info"
                              >
                                <ToggleSwitch checked={enableWebSearch} onChange={setEnableWebSearch} />
                              </OptionRow>

                              {enableWebSearch && (
                                <OptionRow
                                  label="Search Provider"
                                  hint="Which search API to use"
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
                                label="Enable Voice (TTS)"
                                hint="Text-to-speech output for voice replies"
                              >
                                <ToggleSwitch checked={enableTTS} onChange={setEnableTTS} />
                              </OptionRow>

                              {enableTTS && (
                                <OptionRow
                                  label="TTS Provider"
                                  hint="Voice synthesis engine"
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
                                label="Personality"
                                hint="Conversation tone and style"
                              >
                                <OptionSelect
                                  value={hermesPersonality}
                                  onChange={setHermesPersonality}
                                  options={[
                                    { value: 'default', label: 'Default' },
                                    { value: 'helpful', label: 'Helpful' },
                                    { value: 'technical', label: 'Technical' },
                                    { value: 'creative', label: 'Creative' },
                                    { value: 'concise', label: 'Concise' },
                                  ]}
                                />
                              </OptionRow>

                              {/* Memory */}
                              <OptionRow
                                label="Enable Memory"
                                hint="Persist context across conversations"
                              >
                                <ToggleSwitch checked={enableMemory} onChange={setEnableMemory} />
                              </OptionRow>

                              {/* Approval Mode */}
                              <OptionRow
                                label="Approval Mode"
                                hint="How actions are authorized before execution"
                              >
                                <OptionSelect
                                  value={approvalMode}
                                  onChange={setApprovalMode}
                                  options={[
                                    { value: 'auto', label: 'Auto' },
                                    { value: 'ask', label: 'Ask Before Actions' },
                                    { value: 'manual', label: 'Manual' },
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
                                label="Database"
                                hint="Storage backend for agent state and memory"
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
                                label="Enable Image Generation"
                                hint="Allow the agent to generate images"
                              >
                                <ToggleSwitch checked={enableImageGen} onChange={setEnableImageGen} />
                              </OptionRow>

                              {/* Voice */}
                              <OptionRow
                                label="Enable Voice"
                                hint="Speech-to-text and text-to-speech capabilities"
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
                                label="Personality Preset"
                                hint="Selected above -- controls agent tone"
                              >
                                <OptionSelect
                                  value={miladyPersonality}
                                  onChange={(v) => setMiladyPersonality(v as typeof miladyPersonality)}
                                  options={[
                                    { value: 'helpful', label: 'Helpful' },
                                    { value: 'tsundere', label: 'Tsundere' },
                                    { value: 'unhinged', label: 'Unhinged' },
                                    { value: 'custom', label: 'Professional' },
                                  ]}
                                />
                              </OptionRow>

                              {/* Database */}
                              <OptionRow
                                label="Database"
                                hint="Storage backend for agent state"
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
                                label="Local-First Mode"
                                hint="Process data locally before syncing"
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
                <button className="btn-secondary" onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  className="btn-primary"
                  disabled={!isConfigValid}
                  onClick={() => { setStep(4); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: CONFIRM & LAUNCH ────────────────────────────── */}
          {step === 4 && (
            <motion.div
              key="step4"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 text-center">Ready to hatch?</h2>
              <p className="text-[var(--text-muted)] text-sm mb-8 text-center">
                Review your configuration before launching
              </p>

              <motion.div
                className={cn(cardClass, 'p-6 sm:p-8 mb-6')}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* Agent header */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[rgba(46,43,74,0.3)]">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#06b6d4]/10 border border-[#06b6d4]/20" style={{ boxShadow: '0 0 20px rgba(6,182,212,0.15)' }}>
                    <Cpu className="w-7 h-7 text-[#06b6d4]" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[#FFFFFF]">{agentName}</div>
                    <div className="text-sm text-[#71717a]">
                      {selectedFramework === 'openclaw' ? 'OpenClaw' : selectedFramework === 'hermes' ? 'Hermes' : selectedFramework === 'milady' ? 'Milady' : 'ElizaOS'} agent
                      <span className="ml-1.5 text-[10px] px-2 py-0.5 rounded-full bg-[rgba(46,43,74,0.6)] text-[var(--text-muted)] align-middle">
                        {selectedFramework === 'openclaw' ? 'Multi-skill assistant' : selectedFramework === 'hermes' ? 'Autonomous agent' : selectedFramework === 'milady' ? 'Privacy-first runtime' : 'Multi-agent framework'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary details */}
                <div className="space-y-3 text-sm">
                  <SummaryRow label="Agent Type" value={selectedFramework === 'openclaw' ? 'OpenClaw' : selectedFramework === 'hermes' ? 'Hermes' : selectedFramework === 'milady' ? 'Milady' : 'ElizaOS'} />
                  <SummaryRow label="Template" value={AGENT_TEMPLATES.find(t => t.id === selectedTemplate)?.name ?? 'Custom'} />
                  <SummaryRow label="AI Model" value={getLLMSummary()} />

                  {agentDesc && <SummaryRow label="Description" value={agentDesc} />}

                  {(() => {
                    const enabled = Object.entries(platformsEnabled).filter(([, v]) => v).map(([id]) => id);
                    if (enabled.length === 0) return null;
                    const names = enabled.map(id => PLATFORMS.find(p => p.id === id)?.name ?? id).join(', ');
                    return <SummaryRow label="Platforms" value={names} highlight />;
                  })()}

                  <PersonalitySummary
                    framework={selectedFramework}
                    miladyPersonality={miladyPersonality}
                    hermesPersonality={hermesPersonality}
                    systemPrompt={openclawForm.systemPrompt}
                  />

                  <div className="pt-3 border-t border-[rgba(46,43,74,0.3)]">
                    <SummaryRow
                      label="Cost"
                      value={
                        llmChoice === 'free_groq' ? '$0.00 -- free tier' :
                        llmChoice === 'byok' ? '$0.00 -- using your own key' :
                        'Credits deducted per use'
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
                      ? 'bg-[rgba(6,182,212,0.08)] border-[#06b6d4]/40 shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                      : 'bg-[rgba(26,23,48,0.6)] border-[rgba(46,43,74,0.4)] hover:border-[rgba(6,182,212,0.3)] hover:bg-[rgba(26,23,48,0.8)]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#06b6d4]/10 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-[#06b6d4]" />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Test Your Agent</span>
                      <p className="text-xs text-[var(--text-muted)]">Preview how your agent will respond</p>
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
                        <div className="px-4 py-3 border-b border-[rgba(46,43,74,0.3)] bg-[rgba(26,23,48,0.4)]">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#06b6d4]/20 flex items-center justify-center">
                              <Bot className="w-3.5 h-3.5 text-[#06b6d4]" />
                            </div>
                            <span className="text-xs font-medium text-[var(--text-secondary)]">
                              Chat Preview &mdash; {openclawForm.name || 'Your Agent'}
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1 ml-8">
                            This is a simulated preview. Deploy your agent for real conversations.
                          </p>
                        </div>

                        {/* Messages area */}
                        <div className="h-64 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth" id="test-chat-messages">
                          {testMessages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center py-6">
                              <div className="w-12 h-12 rounded-full bg-[rgba(46,43,74,0.4)] flex items-center justify-center mb-3">
                                <MessageCircle className="w-6 h-6 text-[var(--text-muted)]" />
                              </div>
                              <p className="text-sm text-[var(--text-muted)]">Send a message to preview your agent</p>
                              <p className="text-xs text-[var(--text-muted)] mt-1 opacity-60">Try &quot;Hello&quot; or &quot;What can you do?&quot;</p>
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
                                    : 'bg-[rgba(46,43,74,0.6)] text-[var(--text-secondary)] border border-[rgba(46,43,74,0.4)] rounded-bl-md'
                                )}
                              >
                                {msg.role === 'assistant' && (
                                  <span className="block text-[10px] font-semibold text-[#06b6d4] mb-1">
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
                              <div className="bg-[rgba(46,43,74,0.6)] border border-[rgba(46,43,74,0.4)] rounded-2xl rounded-bl-md px-4 py-3">
                                <span className="block text-[10px] font-semibold text-[#06b6d4] mb-1">
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
                        <div className="px-4 py-3 border-t border-[rgba(46,43,74,0.3)] bg-[rgba(26,23,48,0.3)]">
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
                              placeholder="Type a message..."
                              disabled={testLoading}
                              className="flex-1 bg-[rgba(46,43,74,0.4)] border border-[rgba(46,43,74,0.5)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#06b6d4]/50 focus:ring-1 focus:ring-[#06b6d4]/20 transition-all disabled:opacity-50"
                            />
                            <motion.button
                              type="submit"
                              disabled={!testInput.trim() || testLoading}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                                testInput.trim() && !testLoading
                                  ? 'bg-[#06b6d4] text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                                  : 'bg-[rgba(46,43,74,0.4)] text-[var(--text-muted)]'
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
                  <h3 className="text-lg font-bold text-[#FFFFFF] mb-1">Your agent is alive!</h3>
                  <p className="text-[#71717a] text-sm">Redirecting to your agent&apos;s dashboard...</p>
                </motion.div>
              )}

              <div className="flex justify-between items-center">
                <button
                  className="btn-secondary"
                  onClick={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={launching || launched}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <motion.button
                  className={cn(
                    'btn-primary px-8 sm:px-10 py-3.5 sm:py-4 text-base font-bold relative overflow-hidden',
                    !launching && !launched && 'hatch-glow'
                  )}
                  onClick={handleLaunch}
                  disabled={launching || launched}
                  aria-label={launching ? 'Creating agent...' : launched ? 'Agent created successfully' : 'Launch your agent'}
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
                      Hatching...
                    </>
                  ) : launched ? (
                    <>
                      <Check className="w-5 h-5" />
                      Hatched!
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5" />
                      Hatch My Agent!
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
  return (
    <div className="border border-[rgba(46,43,74,0.3)] bg-[rgba(26,23,48,0.4)] rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">System Prompt</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {showCustom
              ? 'Your custom instructions will replace the template default'
              : "Your agent's personality is pre-configured. Customize if you want to change it."}
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
          className="text-xs font-medium text-[#06b6d4] hover:text-[#22d3ee] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#06b6d4]/10"
        >
          {showCustom ? 'Use template default' : 'Customize'}
        </button>
      </div>

      {showCustom && (
        <div className="mt-3">
          <textarea
            id="system-prompt"
            className={cn(inputClass, 'resize-y min-h-[120px]')}
            rows={8}
            placeholder="Write your custom system prompt here. This completely replaces the template default."
            value={form.systemPrompt}
            onChange={(e) => update('systemPrompt', e.target.value)}
            maxLength={8000}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-[var(--text-muted)]">
              Defines your agent&apos;s personality, capabilities, and rules
            </p>
            <span className="text-xs text-[var(--text-muted)]">{form.systemPrompt.length}/8000</span>
          </div>
          {form.systemPrompt.trim().length === 0 && (
            <p className="text-xs text-[#FBBF24] mt-2 ml-1">
              Consider adding a system prompt for better results
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
  const isMiladyCustom = framework === 'milady' && miladyPersonality !== 'helpful';
  const isHermesCustom = framework === 'hermes' && hermesPersonality !== 'default';
  const hasCustomPrompt = systemPrompt.trim();
  let label = 'Template default';
  if (isMiladyCustom) label = miladyPersonality.charAt(0).toUpperCase() + miladyPersonality.slice(1);
  else if (isHermesCustom) label = hermesPersonality.charAt(0).toUpperCase() + hermesPersonality.slice(1);
  else if (hasCustomPrompt) label = 'Custom instructions';
  return <SummaryRow label="Personality" value={label} highlight={!!hasCustomPrompt || isMiladyCustom || isHermesCustom} />;
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
      <span className="text-[#71717a]">{label}</span>
      <span className={cn(
        'text-right',
        valueClass ?? (highlight ? 'text-[#06b6d4]' : 'text-[#A5A1C2]')
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
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06b6d4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0B1A]',
        checked ? 'bg-[#06b6d4]' : 'bg-[rgba(46,43,74,0.8)]'
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
          <option key={o.value} value={o.value} style={{ background: '#0D0B1A' }}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] pointer-events-none" />
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
