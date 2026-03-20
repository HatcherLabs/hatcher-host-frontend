'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@/components/wallet/WalletButton';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { FREE_TIER_LIMITS, HOSTED_CREDIT_MODELS, BYOK_PROVIDERS, getBYOKProvider, AGENT_TEMPLATES } from '@hatcher/shared';
import type { BYOKProvider, AgentTemplateId } from '@hatcher/shared';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { RobotMascot } from '@/components/ui/RobotMascot';
import { useToast } from '@/components/ui/ToastProvider';
import {
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Key,
  Loader2,
  Lock,
  Rocket,
  Sparkles,
  Zap,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: 'Choose a template',
  2: 'Configure your agent',
  3: 'Ready to hatch?',
};

type LLMChoice = 'free_groq' | 'byok' | 'hatcher_credits';

// BYOK_PROVIDERS imported from @hatcher/shared

// ── Templates (derived from shared AGENT_TEMPLATES) ─────────

const CATEGORY_ORDER = ['business', 'development', 'crypto', 'research', 'support', 'custom'] as const;

const OPENCLAW_FREE_SKILLS = FREE_TIER_LIMITS.openclaw.skills;

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
  scale: 1.03,
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
  const { connected } = useWallet();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
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
  const [creditsModel, setCreditsModel] = useState<string>(HOSTED_CREDIT_MODELS[0].model);

  // ── Template state ──
  const [selectedTemplate, setSelectedTemplate] = useState('custom');

  // ── OpenClaw form state ──
  const [openclawForm, setOpenclawForm] = useState({
    name: '',
    description: '',
    systemPrompt: '',  // custom override only — blank means "use template default"
  });
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [openclawSkills, setOpenclawSkills] = useState<string[]>([...OPENCLAW_FREE_SKILLS]);

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
    const selected = HOSTED_CREDIT_MODELS.find((m) => m.model === creditsModel) ?? HOSTED_CREDIT_MODELS[0];
    return {
      modelProvider: 'hatcher_proxy',
      model: selected.model,
    };
  }

  function getLLMSummary(): string {
    if (llmChoice === 'free_groq') return 'Groq Llama 4 Scout (free)';
    if (llmChoice === 'byok') {
      const prov = getBYOKProvider(byokProvider);
      return `BYOK: ${prov?.name ?? byokProvider}${byokModel ? ` / ${byokModel}` : ''}`;
    }
    const selected = HOSTED_CREDIT_MODELS.find((m) => m.model === creditsModel);
    return `Credits: ${selected?.label ?? creditsModel}`;
  }

  // ── Launch ──

  const handleLaunch = async () => {
    setLaunching(true);

    try {
      const llm = getLLMConfig();

      const payload: Parameters<typeof api.createAgent>[0] = {
        name: openclawForm.name,
        ...(openclawForm.description.trim() ? { description: openclawForm.description.trim() } : {}),
        framework: 'openclaw',
        template: selectedTemplate as AgentTemplateId,
        config: {
          model: llm.model ?? 'llama-4-scout-17b',
          provider: llm.modelProvider,
          skills: openclawSkills,
          systemPrompt: openclawForm.systemPrompt.trim()
            ? openclawForm.systemPrompt
            : (AGENT_TEMPLATES.find(t => t.id === selectedTemplate)?.defaultSystemPrompt ?? ''),
          // BYOK config -- backend reads agentConfig['byok']
          ...(llm.byok ? { byok: llm.byok } : {}),
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
      setLaunching(false);
      setLaunched(true);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f97316', '#f97316', '#fed7aa', '#FFFFFF'],
      });

      setTimeout(() => {
        router.push(`/dashboard/agent/${res.data.id}?new=1`);
      }, 2000);
    } catch {
      toast('error', 'Network error — please check your connection and try again.');
      setLaunching(false);
    }
  };

  // ── Auth gates ──

  if (!connected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="min-h-screen flex items-center justify-center px-4"
      >
        <div className={cn(cardClass, 'p-10 max-w-md w-full text-center')}>
          <div className="w-16 h-16 rounded-2xl bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center mx-auto mb-6">
            <Bot className="w-8 h-8 text-[#f97316]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Connect Wallet</h1>
          <p className="text-[var(--text-secondary)] text-sm mb-8">
            Connect your Solana wallet to create and manage your AI agents.
          </p>
          <WalletMultiButton />
        </div>
      </motion.div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className={cn(cardClass, 'p-10 max-w-md w-full text-center')}>
          <Loader2 className="w-10 h-10 text-[#f97316] animate-spin mx-auto mb-4" />
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
          <div className="w-16 h-16 rounded-2xl bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center mx-auto mb-6">
            <Key className="w-8 h-8 text-[#f97316]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-3">Sign In Required</h1>
          <p className="text-[var(--text-secondary)] text-sm mb-8">Sign a message with your wallet to authenticate.</p>
          <button className="btn-primary" onClick={login}>
            Sign In
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Validation ──

  const selectedByokProvider = getBYOKProvider(byokProvider);
  const isConfigValid = openclawForm.name.trim().length >= 3
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
            <RobotMascot
              size="sm"
              mood={step === 1 ? 'happy' : step === 2 ? 'thinking' : 'waving'}
            />
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
                style={{ background: 'linear-gradient(90deg, #fb923c, #f97316, #ea580c)' }}
                initial={{ width: '0%' }}
                animate={{ width: step === 1 ? '16%' : step === 2 ? '50%' : '100%' }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
          </div>
          <div className="flex items-center justify-center gap-0" role="list" aria-label="Creation steps">
            {([1, 2, 3] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center" role="listitem" aria-current={s === step ? 'step' : undefined}>
                {/* Step circle */}
                <div className="flex flex-col items-center gap-2">
                  <motion.div
                    className={cn(
                      'w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2',
                      s < step
                        ? 'bg-[var(--accent-600)] border-[var(--accent-600)] text-white shadow-[0_0_16px_rgba(249,115,22,0.3)]'
                        : s === step
                          ? 'bg-[rgba(249,115,22,0.1)] border-[var(--accent-600)] text-[var(--accent-400)]'
                          : 'bg-transparent border-[var(--border-default)] text-[var(--text-muted)]'
                    )}
                    animate={s === step ? { boxShadow: ['0 0 0 0 rgba(249,115,22,0)', '0 0 16px 6px rgba(249,115,22,0.2)', '0 0 0 0 rgba(249,115,22,0)'] } : {}}
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
                {i < 2 && (
                  <div className="relative w-20 sm:w-32 mx-3 mb-6">
                    <div className="h-0.5 rounded-full bg-[var(--border-default)]" />
                    <motion.div
                      className="absolute top-0 left-0 h-0.5 rounded-full"
                      style={{ background: 'linear-gradient(90deg, #f97316, #ea580c)' }}
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
          {/* ── STEP 1: TEMPLATE ───────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 text-center">Choose a template</h2>
              <p className="text-[var(--text-muted)] text-sm mb-2 text-center">
                Pick a starting point for your agent
              </p>
              <p className="text-xs text-[var(--text-muted)] mb-8 text-center opacity-60">All templates are powered by OpenClaw</p>

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
                                ? 'bg-[#f97316]/10 border-[#f97316] text-[#FFFFFF] shadow-[0_0_24px_rgba(249,115,22,0.15)]'
                                : 'bg-[rgba(26,23,48,0.6)] border-[rgba(46,43,74,0.4)] text-[#A5A1C2] hover:border-[rgba(249,115,22,0.4)] hover:shadow-[0_0_16px_rgba(249,115,22,0.08)]'
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
                                ? 'bg-[#f97316]/20'
                                : 'bg-[rgba(46,43,74,0.4)] group-hover:bg-[#f97316]/10'
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
                <button className="btn-primary" onClick={() => { applyTemplate(); setStep(2); }}>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: CONFIGURE ───────────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 text-center">Configure your agent</h2>
              <p className="text-[var(--text-muted)] text-sm mb-8 text-center">
                Set up your agent&apos;s identity and capabilities
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
                      openclawForm.name.length > 0 && openclawForm.name.trim().length < 3 && 'border-[#F87171]/50 focus:border-[#F87171]/70 focus:ring-[#F87171]/20',
                      openclawForm.name.trim().length === 0 && openclawForm.name !== '' && 'border-[#F87171]/50'
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
                    openclawForm.name.length > 0 && openclawForm.name.trim().length < 3
                      ? 'text-[#F87171]'
                      : 'text-[var(--text-muted)]'
                  )}>
                    {openclawForm.name.length > 0 && openclawForm.name.trim().length < 3
                      ? 'Name must be at least 3 characters'
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

                {/* LLM Choice */}
                <fieldset>
                  <legend className="block text-sm font-medium text-[#FFFFFF] mb-3">
                    LLM Provider
                  </legend>
                  <div className="space-y-3" role="radiogroup" aria-label="LLM Provider selection">
                    {/* Free Groq */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setLlmChoice('free_groq')}
                      className={cn(
                        'w-full p-4 rounded-xl border text-left transition-all duration-200',
                        llmChoice === 'free_groq'
                          ? 'bg-[#f97316]/10 border-[#f97316] shadow-[0_0_16px_rgba(249,115,22,0.1)]'
                          : 'bg-[rgba(26,23,48,0.6)] border-[rgba(46,43,74,0.4)] hover:border-[rgba(249,115,22,0.3)]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#FFFFFF] flex items-center gap-2">
                            Groq Llama 4 Scout
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                              FREE
                            </span>
                          </div>
                          <div className="text-xs text-[#71717a] mt-0.5">Fast and free -- no API key needed</div>
                        </div>
                      </div>
                    </motion.button>

                    {/* BYOK */}
                    <div
                      className={cn(
                        'rounded-xl border transition-all duration-200',
                        llmChoice === 'byok'
                          ? 'bg-[#f97316]/10 border-[#f97316] shadow-[0_0_16px_rgba(249,115,22,0.1)]'
                          : 'bg-[rgba(26,23,48,0.6)] border-[rgba(46,43,74,0.4)]'
                      )}
                    >
                      <button
                        onClick={() => setLlmChoice('byok')}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#f97316]/10 flex items-center justify-center">
                            <Key className="w-5 h-5 text-[#f97316]" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#FFFFFF] flex items-center gap-2">
                              Bring Your Own Key
                              <span className="text-[10px] text-green-400">always free</span>
                            </div>
                            <div className="text-xs text-[#71717a] mt-0.5">Use your own API key for any provider</div>
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
                                          ? 'border-[#f97316] bg-[#f97316]/10 text-[#FFFFFF] shadow-[0_0_8px_rgba(249,115,22,0.15)]'
                                          : 'border-[rgba(46,43,74,0.4)] hover:border-[rgba(249,115,22,0.3)] text-[#A5A1C2]'
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
                                      className="text-[11px] text-[#f97316] hover:text-[#fb923c] transition-colors"
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

                    {/* Hatcher Credits */}
                    <div
                      className={cn(
                        'rounded-xl border transition-all duration-200',
                        llmChoice === 'hatcher_credits'
                          ? 'bg-[#f97316]/10 border-[#f97316] shadow-[0_0_16px_rgba(249,115,22,0.1)]'
                          : 'bg-[rgba(26,23,48,0.6)] border-[rgba(46,43,74,0.4)]'
                      )}
                    >
                      <button
                        onClick={() => setLlmChoice('hatcher_credits')}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#f97316]/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-[#f97316]" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#FFFFFF]">Hatcher Credits</div>
                            <div className="text-xs text-[#71717a] mt-0.5">Premium models through Hatcher -- no API key needed</div>
                          </div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {llmChoice === 'hatcher_credits' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3 border-t border-[rgba(46,43,74,0.3)] pt-4">
                              <label className="block text-xs text-[#A5A1C2] mb-2 uppercase tracking-wider">Select Model</label>
                              <div className="space-y-2">
                                {HOSTED_CREDIT_MODELS.map((m) => (
                                  <motion.button
                                    key={m.model}
                                    type="button"
                                    whileHover={{ scale: 1.01 }}
                                    onClick={() => setCreditsModel(m.model)}
                                    className={cn(
                                      'w-full text-left border rounded-xl px-4 py-3 transition-all',
                                      creditsModel === m.model
                                        ? 'border-[#f97316] bg-[#f97316]/5 shadow-[0_0_8px_rgba(249,115,22,0.1)]'
                                        : 'border-[rgba(46,43,74,0.4)] hover:border-[rgba(249,115,22,0.3)]'
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="text-sm font-medium text-[#FFFFFF]">{m.label}</span>
                                        <span className="text-xs text-[#71717a] ml-2">{m.provider}</span>
                                      </div>
                                      <div className="text-xs text-[#71717a]">
                                        ${m.inputPer1k}/1k in | ${m.outputPer1k}/1k out
                                      </div>
                                    </div>
                                  </motion.button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </fieldset>

                {/* OpenClaw fields */}
                <OpenClawFields
                  form={openclawForm}
                  setForm={setOpenclawForm}
                  skills={openclawSkills}
                  toggleSkill={toggleSkill}
                  showCustomPrompt={showCustomPrompt}
                  setShowCustomPrompt={setShowCustomPrompt}
                />
              </div>

              <div className="mt-8 flex justify-between">
                <button className="btn-secondary" onClick={() => { setStep(1); }}>
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  className="btn-primary"
                  disabled={!isConfigValid}
                  onClick={() => { setStep(3); }}
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: CONFIRM & LAUNCH ────────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
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
                className={cn(cardClass, 'p-6 sm:p-8 mb-6 card-glow-border')}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* Agent header */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[rgba(46,43,74,0.3)]">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#f97316]/10 border border-[#f97316]/20" style={{ boxShadow: '0 0 20px rgba(249,115,22,0.15)' }}>
                    <Cpu className="w-7 h-7 text-[#f97316]" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[#FFFFFF]">{agentName}</div>
                    <div className="text-sm text-[#71717a]">OpenClaw agent</div>
                  </div>
                </div>

                {/* Summary details */}
                <div className="space-y-3 text-sm">
                  <SummaryRow label="Framework" value="OpenClaw" />
                  <SummaryRow label="Template" value={AGENT_TEMPLATES.find(t => t.id === selectedTemplate)?.name ?? 'Custom'} />
                  <SummaryRow label="LLM" value={getLLMSummary()} />

                  {agentDesc && <SummaryRow label="Description" value={agentDesc} />}

                  <SummaryRow label="Skills" value={`${openclawSkills.length} selected`} />
                  <SummaryRow
                    label="System Prompt"
                    value={openclawForm.systemPrompt.trim() ? 'Custom' : 'Template default'}
                    highlight={!!openclawForm.systemPrompt.trim()}
                  />

                  <div className="pt-3 border-t border-[rgba(46,43,74,0.3)]">
                    <SummaryRow
                      label="Cost"
                      value={
                        llmChoice === 'free_groq' ? '$0.00 -- free tier' :
                        llmChoice === 'byok' ? '$0.00 -- BYOK (your key)' :
                        'Credits deducted per use'
                      }
                      valueClass="text-green-400"
                    />
                  </div>
                </div>
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
                  onClick={() => { setStep(2); }}
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
                      '0 0 0 0 rgba(249, 115, 22, 0)',
                      '0 0 20px 6px rgba(249, 115, 22, 0.3)',
                      '0 0 0 0 rgba(249, 115, 22, 0)',
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
              ? 'Your custom prompt will replace the template default'
              : 'Pre-configured based on your template selection'}
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
          className="text-xs font-medium text-[#f97316] hover:text-[#fb923c] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#f97316]/10"
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
        valueClass ?? (highlight ? 'text-[#f97316]' : 'text-[#A5A1C2]')
      )}>
        {value}
      </span>
    </div>
  );
}

// ── OpenClaw-specific Fields ────────────────────────────────

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
      {/* Skills */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
          Skills
          <span className="text-[#71717a] text-xs font-normal ml-2">Free tier: {OPENCLAW_FREE_SKILLS.length} basic skills</span>
        </label>

        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {OPENCLAW_FREE_SKILLS.map((skill) => {
              const isActive = skills.includes(skill);
              return (
                <motion.button
                  key={skill}
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleSkill(skill)}
                  className={cn(
                    'text-sm border rounded-full px-4 py-2 transition-all duration-200',
                    isActive
                      ? 'border-[#f97316]/40 bg-[#f97316]/10 text-[#FFFFFF] shadow-[0_0_8px_rgba(249,115,22,0.12)]'
                      : 'border-[rgba(46,43,74,0.4)] text-[#A5A1C2] hover:border-[rgba(249,115,22,0.3)] hover:bg-[rgba(249,115,22,0.05)]'
                  )}
                >
                  {isActive && <Check className="w-3 h-3 inline mr-1.5" />}
                  {skill}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.3)] rounded-xl px-4 py-3 text-center backdrop-blur-sm">
          <Lock className="w-4 h-4 text-[#f97316]/40 mx-auto mb-1.5" />
          <p className="text-xs text-[#71717a]">Unlock more skills after creation via the features tab</p>
          <p className="text-[10px] text-[#71717a]/70 mt-0.5">10 skills ($5) or unlimited ($18)</p>
        </div>
      </div>

      {/* System Prompt */}
      <SystemPromptSection
        form={form}
        update={update}
        showCustom={showCustomPrompt}
        setShowCustom={setShowCustomPrompt}
        inputClass={inputClass}
      />

      {/* Locked features */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="border border-[rgba(46,43,74,0.3)] bg-[rgba(26,23,48,0.6)] rounded-xl px-4 py-4 text-center backdrop-blur-sm">
          <Lock className="w-4 h-4 text-[#f97316]/40 mx-auto mb-1.5" />
          <p className="text-sm text-[#71717a]">Scheduled Tasks</p>
          <p className="text-xs text-[#71717a]/70 mt-0.5">$5/mo -- unlock after creation</p>
        </div>
        <div className="border border-[rgba(46,43,74,0.3)] bg-[rgba(26,23,48,0.6)] rounded-xl px-4 py-4 text-center backdrop-blur-sm">
          <Lock className="w-4 h-4 text-[#f97316]/40 mx-auto mb-1.5" />
          <p className="text-sm text-[#71717a]">Webhooks</p>
          <p className="text-xs text-[#71717a]/70 mt-0.5">$6/mo -- unlock after creation</p>
        </div>
      </div>
    </>
  );
}
